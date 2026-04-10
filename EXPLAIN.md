# How Everything Works

A plain-language walkthrough of the entire codebase. After reading this, you'll understand what every folder, file, and code block does.

---

## Table of Contents

- [The Big Picture](#the-big-picture)
- [Root Files](#root-files)
  - [index.html](#indexhtml)
  - [vite.config.js](#viteconfigjs)
  - [svelte.config.js](#svelteconfigjs)
  - [package.json](#packagejson)
  - [.github/workflows/deploy.yml](#githubworkflowsdeployyml)
- [src/](#src)
  - [main.js](#srcmainjs)
  - [App.svelte](#srcappsvelte)
- [src/lib/ — Business Logic](#srclib--business-logic)
  - [constants.js](#srclibconstantsjs)
  - [stores.js](#srclibstoresjs)
  - [drive.js](#srclibdrivejs)
  - [parser.js](#srclibparserjs)
  - [cache.js](#srclibcachejs)
  - [charts.js](#srclibchartsjs)
- [src/components/ — Reusable UI Pieces](#srccomponents--reusable-ui-pieces)
  - [Nav.svelte](#srccomponentsnavsvelte)
  - [DropZone.svelte](#srccomponentsdropzonesvelte)
  - [FileChip.svelte](#srccomponentsfilechipsvelte)
  - [ScrapingProgress.svelte](#srccomponentsscrapingprogresssvelte)
  - [ScheduledFiles.svelte](#srccomponentsscheduledfilessvelte)
  - [SingleFile.svelte](#srccomponentssinglefilesvelte)
  - [TrendView.svelte](#srccomponentstrendviewsvelte)
  - [Magnifier.svelte](#srccomponentsmagnifiersvelte)
- [src/pages/ — Full Page Views](#srcpages--full-page-views)
  - [Scraping.svelte](#srcpagesscrapingsvelte)
  - [Analysis.svelte](#srcpagesanalysissvelte)
- [src/css/ — Stylesheets](#srccss--stylesheets)
  - [base.css](#srccssbasecss)
  - [scraping.css](#srccsscrapingcss)
  - [sewera.css](#srccsseweracss)
  - [dobromir.css](#srccssdobromircss)
- [How It All Connects](#how-it-all-connects)

---

## The Big Picture

This is a **price intelligence dashboard** for a company called Sewera. It does two things:

1. **Scraping page** — lets you upload Excel files to Google Drive that trigger a scraping process, and shows live progress of ongoing scrapes.
2. **Analysis page** — downloads Excel result files from Google Drive, parses them, and shows dashboards with charts, KPIs, and tables comparing your prices against competitors.

The app has two "branches" — **Sewera** and **Dobromir** — which are two different product lines. They work identically but have different competitor lists, different Google Drive folders, and different accent colors.

There's no backend. Everything runs in the browser. Google Drive is the "database" — files get uploaded there and downloaded from there. The app talks directly to Google's API using OAuth.

### Key technologies

- **Svelte 5** — a UI framework that compiles your components into fast vanilla JS. You write `.svelte` files with HTML, CSS, and JS together.
- **Vite** — a build tool that bundles everything into static files (HTML + JS + CSS) for deployment.
- **Chart.js** — draws the bar charts and line charts.
- **SheetJS (xlsx)** — reads Excel `.xlsx` files in the browser.
- **Google Identity Services** — handles the OAuth login popup to connect to Google Drive.
- **IndexedDB** — browser-side database used to cache analysis results so you don't re-download files every time.

### Svelte concepts you need to know

- **`$state(value)`** — declares a reactive variable. When it changes, the UI updates automatically.
- **`$derived(expression)`** — a computed value that recalculates when its dependencies change. Like a spreadsheet formula.
- **`$derived.by(() => { ... })`** — same thing but for multi-line computations.
- **`$effect(() => { ... })`** — runs side effects when reactive values inside it change. Like "whenever X changes, do Y."
- **`$props()`** — declares what data a component receives from its parent.
- **`{#if ...} {:else} {/if}`** — conditional rendering in templates.
- **`{#each array as item} {/each}`** — loops in templates.
- **Stores** (`writable`, `derived`) — shared reactive values that live outside components. Any component can subscribe to them with `$storeName`.

---

## Root Files

### index.html

The single HTML page that everything loads into.

```
<meta name="google-client-id" content="...">
```
Stores the Google OAuth client ID. The JS code reads this to know which Google app to authenticate with.

```
<meta name="progress-relay-url" content="https://10.1.0.172:8001">
```
URL of the scraping progress server. The app connects to this via Server-Sent Events (SSE) to show live scraping progress.

```
<script src="https://accounts.google.com/gsi/client" async defer onload="window._gsiReady = true">
```
Loads Google's authentication library from their CDN. When it finishes loading, it sets a flag (`_gsiReady`) that our code watches for.

```
<div id="app"></div>
<script type="module" src="/src/main.js"></script>
```
The mount point. Svelte renders the entire app inside this `<div>`. The `main.js` script is the entry point.

### vite.config.js

```js
base: '/price-svelte/',
plugins: [svelte()],
```

Two settings:
- **`base`** — tells Vite that the app lives at `/price-svelte/` on the server (because GitHub Pages serves it at `fatalerrordev.github.io/price-svelte/`). Without this, all asset URLs would be wrong.
- **`plugins: [svelte()]`** — tells Vite to process `.svelte` files.

### svelte.config.js

Empty config file. Just tells tools "yes, this is a Svelte project." No custom settings needed.

### package.json

- **`npm run dev`** — starts a local development server with hot reload.
- **`npm run build`** — compiles everything into static files in `dist/`.
- **`npm run preview`** — serves the built `dist/` folder locally to test it.
- **Dependencies**: `chart.js` (charts) and `xlsx` (Excel parsing).
- **Dev dependencies**: `svelte`, `vite`, and the Svelte plugin for Vite.

### .github/workflows/deploy.yml

A GitHub Actions workflow that runs automatically on every push to `main`:

1. Checks out the code
2. Installs Node.js 20
3. Runs `npm ci` (installs dependencies)
4. Runs `npm run build` (creates `dist/`)
5. Uploads `dist/` to GitHub Pages

This is why you don't need to build manually — push your code and GitHub does the rest.

---

## src/

### src/main.js

```js
import { mount } from 'svelte';
import App from './App.svelte';

const app = mount(App, {
  target: document.getElementById('app'),
});
```

The entry point. It imports the root `App` component and mounts it into the `<div id="app">` element in `index.html`. That's it — three lines. Everything else happens inside App.svelte and its children.

### src/App.svelte

The root component. It's the shell that holds everything together.

**Imports:**
- All four CSS files (Vite bundles them into one stylesheet)
- The `Nav` component (navigation bar)
- The two page components (`Scraping` and `Analysis`)
- The `Magnifier` easter egg component
- Stores and Drive initialization functions

**`$effect` — Body class switching:**
```js
$effect(() => {
  if ($currentPage === 'scraping') {
    document.body.className = 'page-scraping';
  } else {
    document.body.className = 'page-' + $currentBranch;
  }
});
```
This is the theming engine. The CSS files define different accent colors for each body class (`page-scraping` = green, `page-sewera` = blue, `page-dobromir` = orange). Every time the user switches pages or branches, this effect fires and swaps the body class, which cascades through all the CSS variables.

**`generateFavicon()`:**
Draws the favicon dynamically using a `<canvas>` element — a dark square with "S" in white and "//" in green. This avoids needing a favicon file.

**`onMount`:**
When the app starts:
1. Generate the favicon
2. Wait for Google's auth library to load (`waitForGSI`)
3. Initialize the Google Drive connection (`initDrive`)

**Template — Page routing:**
```svelte
{#if $currentPage === 'scraping'}
  <Scraping />
{:else}
  {#key $currentBranch}
    <Analysis branch={$currentBranch} />
  {/key}
{/if}
```
Simple conditional: show Scraping page or Analysis page. The `{#key}` block is important — it tells Svelte "destroy and recreate the Analysis component whenever the branch changes." This ensures a clean slate when switching between Sewera and Dobromir.

---

## src/lib/ — Business Logic

These are plain JavaScript modules (not Svelte components). They contain the core logic that doesn't depend on any UI.

### src/lib/constants.js

Shared constants and tiny utilities used across multiple components:

- **`DAYS`** — array of day names (`['monday', 'tuesday', ..., 'sunday']`). Used by both the Scraping page (day picker buttons) and the ScheduledFiles component (day grid).
- **`DAY_LABELS`** — maps full day names to short labels (`{ monday: 'Mon', ... }`). Used for display text.
- **`capitalize(str)`** — capitalizes the first letter of a string. Used in several places (schedule button label, progress panel headings).

These were extracted from duplicated code in Scraping.svelte and ScheduledFiles.svelte to avoid having the same arrays defined twice.

### src/lib/stores.js

Four shared pieces of state that multiple components need:

- **`currentPage`** — `'scraping'` or `'analysis'`. Controls which page is shown.
- **`currentBranch`** — `'sewera'` or `'dobromir'`. Controls which branch's data to show.
- **`accessToken`** — the Google OAuth token. `null` when not signed in.
- **`isSignedIn`** — automatically `true` when `accessToken` has a value, `false` when it's `null`. This is a `derived` store — it computes itself from `accessToken`.

Any component can read these with `$currentPage`, `$isSignedIn`, etc. Any component can write to them with `.set()`.

### src/lib/drive.js

Everything related to Google Drive. This is the "API layer."

**`FOLDERS`** — an object mapping folder names to Google Drive folder IDs:
- `input` — where files go for immediate scraping
- `monday` through `sunday` — scheduled upload folders
- `sewera`, `dobromir` — where analysis result files live

**`getClientId()`** — reads the OAuth client ID from the `<meta>` tag in `index.html`.

**`initDrive()`** — sets up the Google OAuth client. Creates a "token client" that can request access tokens. If there's a saved token in `sessionStorage`, it checks if it's still valid by calling Google's token info endpoint. If valid, sets the token in the store so the app knows you're signed in.

**`signIn()`** — triggers the Google OAuth popup. When the user approves, the callback saves the token to both `sessionStorage` (persists across page reloads within the session) and the `accessToken` store (tells the rest of the app).

**`disconnectDrive()`** — revokes the token with Google and clears it everywhere.

**`uploadFile(file, folderId)`** — uploads a file to a specific Google Drive folder using the multipart upload API. Returns the file metadata (including a link to view it in Drive).

**`listFiles(folderId)`** — lists all `.xlsx` files in a folder, sorted by modification time (newest first).

**`deleteFile(fileId)`** — deletes a file from Google Drive.

**`downloadFile(fileId)`** — downloads a file's content as an `ArrayBuffer` (raw bytes). This is what gets fed into the Excel parser.

**`waitForGSI()`** — returns a Promise that resolves when Google's auth library has finished loading. Polls every 100ms, gives up after 10 seconds.

**Authentication pattern:** Every API function (`uploadFile`, `listFiles`, etc.) calls `requireAuth()` first, which throws an error if there's no access token. The token is attached to requests as a `Bearer` header.

### src/lib/parser.js

The analysis engine. Takes raw Excel data and produces structured analysis results.

**`BRANCH_CONFIG`** — defines the differences between Sewera and Dobromir:
- `label` — display name
- `ownPrice` — column name for our price in the Excel file
- `diffColumn` — column name for the percentage difference (e.g., "Sewera-Najtanszy")
- `competitors` — list of competitor names (these are also column names in the Excel file)
- `folderId` — which Google Drive folder to read from

**`parseXlsx(arrayBuffer)`** — takes raw file bytes, feeds them to SheetJS, and returns an array of row objects. Each row is like `{ "Product": "Widget", "Sewera B2C KTW": "49.99", "Castorama": "52.99", ... }`.

**`parsePct(val)`** — parses a percentage value that might be in Polish format (comma instead of dot as decimal separator). Handles all the edge cases: `null`, `'-'`, empty strings, `%` signs.

**`hasPrice(val)`** — checks if a cell actually has a price in it (not empty, not a dash).

**`calcMedian(arr)`** — calculates the median (middle value) of an array of numbers.

**`findCol(row, keys)`** — tries multiple possible column names to find a product name or producer. Excel files aren't always consistent with column naming, so this does fuzzy matching.

**`analyzeFile(rows, branch)`** — the big one. Takes all the rows from an Excel file and produces a complete analysis:
1. Scans the first row to figure out which columns exist
2. Auto-detects the "name" and "producer" columns by looking for keywords like "nazwa", "product", "producent"
3. Loops through every row and calculates:
   - **Total products** count
   - **With/without competitor data** — how many products have competitor price comparisons
   - **Cheaper vs expensive** — how many products where we're cheaper vs more expensive
   - **Price difference distribution** — buckets like "0 to 5%", "5 to 15%", etc.
   - **Competitor coverage** — how many products each competitor has prices for
   - **Segment breakdown** — groups products by their "Segment" column and calculates stats per segment
   - **Top 10 most expensive** — products where we're most expensive compared to competitors
   - **Top 10 cheapest** — products where we're cheapest
4. Filters out outliers (differences below -100% or above +200%)
5. Returns everything as a structured object

**`extractDate(filename)`** — pulls a date in DD-MM-YYYY format from a filename using regex.

**`dateSortKey(dateStr)`** — converts DD-MM-YYYY to YYYYMMDD so dates sort correctly as strings.

**`escHtml(s)`** — escapes HTML special characters to prevent injection. Used in a few places where raw HTML strings are still built.

### src/lib/cache.js

An IndexedDB-based caching layer. Analysis results are expensive to compute (download file + parse Excel + analyze), so this caches them.

**How it works:** Each analysis result is stored in IndexedDB with the file's ID and modification time as the key. If you request analysis for a file that hasn't changed since last time, it returns the cached result instantly instead of re-downloading.

**`openCache()`** — opens (or creates) the IndexedDB database. Falls back to an in-memory object if IndexedDB isn't available.

**`getCachedResult(fileId, modifiedTime)`** — looks up a cached result. Returns `null` if the cache doesn't have it or if the file has been modified since it was cached. Also checks `CACHE_VERSION` — if the analysis logic changes, bump this number and all old caches are invalidated.

**`setCachedResult(fileId, modifiedTime, branch, result)`** — stores an analysis result in the cache.

**`getAnalysis(file, branch)`** — the main function other code calls. It:
1. Checks the cache — if hit, returns instantly
2. If miss, downloads the file, parses it, analyzes it, caches the result
3. Uses a `pending` map to deduplicate — if two things request the same file simultaneously, only one download happens

**`preloadAll(branch, files)`** — background preloading. When you open the Analysis page, it starts caching all files in the background with a concurrency limit of 3 (so it doesn't hammer Google Drive with too many simultaneous requests). Updates a `preloadProgress` store so the UI can show "Caching 5/20 files..."

**`preloadProgress`** — a Svelte store that holds `{ sewera: { done: 5, total: 20, running: true }, ... }`. Components subscribe to this to show progress.

### src/lib/charts.js

Wrappers around Chart.js that create the specific chart types this app needs.

**`chartInstances`** — tracks all active chart instances by canvas ID. Chart.js requires you to destroy a chart before creating a new one on the same canvas, so this keeps track.

**`SERIES_COLORS`** — 20 distinct colors used for multi-line charts (one color per competitor or segment).

**`destroyChart(canvasId)` / `destroyAllCharts()`** — cleanup functions. Called before recreating charts or when switching pages.

**`getChartDefaults()`** — reads CSS variables from the body (`--text3`, `--accent`, etc.) to style charts consistently with the current theme.

**`createDistributionChart(canvasId, distData)`** — a vertical bar chart showing how many products fall into each price difference bucket (e.g., "50 products are 0-5% more expensive"). Uses a gradient of colors from blue (cheaper) through gray (equal) to red (expensive).

**`createCoverageChart(canvasId, compCoverage)`** — a horizontal bar chart showing how many products each competitor has prices for. Sorted by coverage (most coverage at top).

**`createLineChart(canvasId, labels, values)`** — a simple line chart with one series. Used for "Median % Over Time" and "% Cheapest Over Time" trends.

**`createSeriesLineChart(canvasId, dates, seriesData)`** — a multi-line chart where each line is a competitor or segment. Has a custom plugin (`sumPlugin`) that draws the total sum above each data point. Returns the chart instance so callers can toggle dataset visibility.

---

## src/components/ — Reusable UI Pieces

### src/components/Nav.svelte

The top navigation bar. Contains three sections:

1. **Logo** — "SEWERA // PRICE INTEL" (the "//" is colored with the accent color)
2. **Page tabs** — "Scraping" and "Analysis" buttons. Clicking sets `currentPage` in the store.
3. **Branch toggle** — "Sewera" and "Dobromir" buttons. Only visible when on the Analysis page (controlled by `class:visible`). Clicking sets `currentBranch`.

Also contains the **auth bar** below the nav — either a "Connect Google Drive" button (when signed out) or a "Connected to Drive ✓" status that you can click to disconnect.

### src/components/DropZone.svelte

A reusable drag-and-drop file input. Used twice on the Scraping page (once for "Run Now", once for "Schedule").

**Props:** `onfile` — a callback function that receives the selected file.

**State:** `dragover` (is something being dragged over?), `hasFile` (has a file been selected?), `errorMsg` (validation error).

**How it works:**
- Listens for `dragover`, `dragleave`, `drop` events for drag-and-drop
- Also supports click-to-browse: creates a hidden `<input type="file">` and clicks it programmatically
- Validates that the file ends with `.xlsx`
- Changes visual state: dashed border when empty, solid border when a file is selected, accent-colored border when dragging over

**`export function reset()`** — exposed to parent components via `bind:this`. The parent calls `dropZone.reset()` to clear the state (e.g., after uploading).

### src/components/FileChip.svelte

A tiny component — shows a selected file's name with an "×" button to remove it. Like a tag/chip you see in search interfaces.

**Props:** `name` (file name to display), `onremove` (callback when × is clicked).

### src/components/ScrapingProgress.svelte

Shows live scraping progress using Server-Sent Events (SSE).

**How SSE works:** The app opens a persistent HTTP connection to the relay server. The server pushes events down this connection in real-time — no polling needed.

**`connect()`** — opens an `EventSource` connection to `{relayUrl}/events`. Listens for three event types:
- **`init`** — server sends all currently active sessions on connect. We store them in `sessions`.
- **`update`** — a session's progress changed (e.g., moved to next competitor). We update that session.
- **`session_end`** — a scraping session finished. We remove it.

**Connection status:** Shows "Connected" (green), "Connecting..." (yellow), or "Disconnected — click to authorize" (gray link to the relay server, in case the SSL cert needs approval).

**`sessionsByLocation`** — a `$derived.by` that groups all sessions by branch. Uses `BRANCH_CONFIG` keys to know the valid branches, and `normalizeLocation` to map each session's location string. This is computed once and reused in the template, avoiding repeated filtering.

**Layout:** Two columns — one per branch from `BRANCH_CONFIG`. Each shows its active scraping sessions with a competitor name, progress percentage, and a progress bar.

**`normalizeLocation(loc)`** — the relay server sends a `location` field. This maps it to either "sewera" or "dobromir" (checks if it contains "dobromir", otherwise defaults to "sewera").

**Lifecycle:** `onMount` starts the connection, `onDestroy` closes it.

### src/components/ScheduledFiles.svelte

Shows a grid of scheduled files organized by day of the week (Mon-Sun).

**How it loads:**
A single `$effect` watches `$isSignedIn` — whenever it becomes `true`, it calls `loadScheduledFiles()`. This covers both the initial mount (if already signed in) and later sign-in transitions.

**`loadScheduledFiles()`:**
1. Fires 7 parallel requests to Google Drive (one per day folder)
2. Uses `Promise.allSettled` so one failing folder doesn't break everything
3. Groups files by day
4. If all 7 fail, shows an error. If some fail, shows a warning banner.

**Template:** A flex grid of 7 "day slots." Each slot shows the day label and either "—" (empty) or a list of files. Each file shows its name (linked to Google Drive), upload date, and a delete button.

**`handleDelete(fileId)`** — confirms with the user, then calls the Drive API to delete the file, then reloads the grid.

**`export async function loadScheduledFiles()`** — exposed so the parent (Scraping page) can trigger a reload after uploading a scheduled file.

### src/components/SingleFile.svelte

The dashboard that appears when you select a single file in Analysis mode. This is the most visually dense component.

**Props:** `data` (the analysis result object from `analyzeFile`), `branch`.

**Derived values:** KPI percentages (`pctCheaper`, `pctExpensive`), median color class, and sorted segments are all `$derived` — they recompute automatically when `data` changes, and Svelte memoizes them so they don't recalculate on unrelated re-renders.

**Sections rendered:**

1. **KPI Grid** — 6 cards showing: total products, with competitor data, % cheapest/equal (green), % more expensive (red), median price diff (amber if positive), no competitor data.

2. **Chart Row** — two charts side by side:
   - Competitor Coverage (horizontal bar chart)
   - Price Distribution (vertical bar chart with color gradient)

3. **Segment Breakdown** — a list of product segments, each with a horizontal stacked bar (blue = cheaper, red = expensive) and stats. Sorted by the ratio of cheaper products (best segments first).

4. **Product Comparison** — a tabbed table. Two tabs: "najdrozsza" (most expensive) and "najtansza" (cheapest). Shows the top 10 products in each category with name, producer, and price difference badge.

**Chart creation:** Uses `$effect` — whenever `data` or `branch` changes, it waits for the DOM to update (`tick()`), then creates the charts on the new canvas elements.

### src/components/TrendView.svelte

The multi-file trend dashboard. Appears when you switch to "All Files Trend" mode in Analysis.

**Props:** `analyses` (array of analysis results, one per file, sorted by date), `branch`.

**Derived values** (automatically recomputed):
- `first` / `last` — first and last analysis in the array
- `medianChange` — how the median price diff changed from first to last file
- `pctCheapChange` — how the percentage of cheapest products changed
- `compSeries` — competitor coverage over time (for the multi-line chart)
- `segSeries` — segment product counts over time
- `segmentTrend` — segment-by-segment first→last comparison

**Sections:**

1. **Trend KPIs** — files analyzed, median change (in percentage points), % cheapest change, products in latest file.

2. **Two line charts** — "Median % Over Time" and "% Cheapest Over Time."

3. **Products Scraped Over Time** — a multi-line chart switchable between "Competitors" and "Segments" views. Each line is one competitor/segment. Has toggle buttons to show/hide individual lines, and an "All/None" button.

4. **Segment Trend Table** — shows each segment's median from the first file → last file, with the delta. Sorted by biggest absolute change.

**Coverage chart rebuild:** When you switch between Competitors/Segments mode, a `$effect` watches `currentSeries` and rebuilds the chart. Toggle buttons directly call `chart.setDatasetVisibility()` for instant toggling without rebuilding.

### src/components/Magnifier.svelte

An easter egg — a draggable magnifying glass that zooms into the page. Activated with **Ctrl+Alt+=**.

**How it works:**
1. When activated, creates a DOM overlay with two layers:
   - A circular "lens" viewport that shows a 2x magnified clone of the page
   - An SVG magnifying glass graphic (detailed with metal rim, wooden handle, glass reflections) layered on top

2. **`refreshContent()`** — clones the entire page DOM, replaces `<canvas>` elements with `<img>` snapshots (because cloning loses canvas pixel data), and puts the clone inside the lens.

3. **`updatePosition()`** — as you drag the magnifier, it calculates which part of the page the lens center is over, then offsets the cloned content so the correct area shows through the circular viewport at 2x zoom.

4. The SVG handle is draggable — mousedown on it starts dragging, mousemove updates position, mouseup stops.

5. `onDestroy` cleans everything up (removes overlay, event listeners).

---

## src/pages/ — Full Page Views

### src/pages/Scraping.svelte

The scraping upload page. Composed of four sections:

**1. Run Now Card**
- A DropZone for file selection
- A FileChip showing the selected file
- "Upload & Start Scraping" button (disabled until a file is selected)
- After upload: success message with Drive link, or error message

**2. Schedule Card**
- A DropZone for file selection
- A FileChip showing the selected file
- Day picker (Mon-Sun buttons, only one can be active)
- "Schedule for [Day]" button (disabled until file + day are selected)
- After upload: success message, then reloads the scheduled files grid

**`doRunNowUpload()`** — uploads the file to the `input` folder (immediate scraping).

**`doScheduleUpload()`** — uploads the file to the selected day's folder.

Both functions check `$isSignedIn` first, show a loading spinner during upload, and handle success/error states.

**3. ScrapingProgress** — embedded component showing live scraping sessions.

**4. ScheduledFiles** — embedded component showing the Mon-Sun file grid. Connected via `bind:this` so the page can call `loadScheduledFiles()` after a successful schedule upload.

### src/pages/Analysis.svelte

The analysis page. Receives `branch` as a prop from App.svelte.

**State management:**
- `mode` — `'single'` or `'all'` (single file view vs trend view)
- `files` — list of files from Google Drive
- `selectedFileId` — which file tile is currently selected
- `selectedResult` — the analysis result for the selected file
- `allAnalyses` — array of all analysis results (for trend view)

**`$effect` for loading:**
A single `$effect` watches `$isSignedIn`. When it's `true`, it calls `resetAndLoad()` which clears state and loads the file list. When `false`, it clears the file list. The function guards against concurrent execution — if a load is already running, it skips.

**`loadFileList()`:**
1. Calls `listFiles()` with the branch's folder ID
2. Extracts dates from filenames and sorts oldest→newest
3. Renders file tiles
4. Kicks off background preloading (`preloadAll`) for this branch AND the other branch

**`setMode(newMode)`** — switches between single and trend view. Destroys all charts, then either waits for file selection (single) or immediately runs all-file analysis (trend).

**`selectFile(fileId)`** — clicking a tile. If it's already selected, deselects it. Otherwise, selects it and runs single-file analysis.

**`runSingleFileAnalysis(file)`** — calls `getAnalysis()` (which checks cache first), then sets `selectedResult` which causes SingleFile.svelte to render.

**`runAllFilesAnalysis()`** — calls `getAnalysis()` for every file in parallel, then sets `allAnalyses` which causes TrendView.svelte to render.

**Preload status:** Shows "Caching 5/20 files..." during background preload, then "All 20 files cached ✓" for 3 seconds before disappearing.

**Template layout:**
1. Header with branch name and Single/Trend mode toggle
2. Preload status line
3. File tiles grid (only in single mode)
4. Result area — either SingleFile, TrendView, loading spinner, or empty state message

---

## src/css/ — Stylesheets

All CSS is global (not component-scoped). This is intentional — it preserves the exact look from the original vanilla JS version.

### src/css/base.css

The main stylesheet. ~590 lines covering:

- **CSS Reset** — `box-sizing: border-box` on everything, zero margins/padding.
- **CSS Variables** (`:root`) — all the colors, fonts, and spacing. The theme system works through these variables — components reference `var(--accent)` and the actual color depends on which body class is active.
- **Typography** — Syne font for headings, DM Mono for everything else.
- **Navigation** — sticky top bar, tab buttons with bottom border highlight.
- **Branch toggle** — hidden by default, shown with `.visible` class.
- **Auth bar** — centered bar below nav.
- **Cards** — dark rounded containers (`.card`).
- **Drop zones** — dashed border containers for file upload.
- **File chips** — inline tags with remove button.
- **Buttons** — `.btn-accent` (solid colored) and `.btn-outline` (border only).
- **KPI cards** — grid of stat cards with label + big number.
- **Chart containers** — cards with responsive canvases.
- **Segment bars** — horizontal stacked bars with labels.
- **Product tables** — data tables with percentage badges.
- **Competitor toggles** — colored buttons for show/hide.
- **Trend tables** — comparison tables with delta coloring.
- **Mode toggles** — pill-shaped button groups.
- **File tiles** — clickable grid of file cards.
- **State indicators** — empty states, error messages, success messages, loading spinners.
- **Responsive breakpoints** — at 700px, grids collapse to single column.

### src/css/scraping.css

Styles specific to the scraping page:

- **Accent color:** `body.page-scraping { --accent: #c8f060; }` — green.
- **Scheduled files grid** — 7 flex columns for Mon-Sun.
- **Day slots** — cards with file lists, delete buttons.
- **Progress panel** — two-column layout for Sewera/Dobromir progress.
- **Progress bars** — track + fill with CSS transitions.
- **Connection status** — green/yellow/gray dot.
- **Session cards** — with `.complete` and `.removing` states.

### src/css/sewera.css

One line: `body.page-sewera { --accent: #60a0f0; --accent-dim: rgba(96,160,240,0.08); }`

Sets blue as the accent color when viewing Sewera analysis.

### src/css/dobromir.css

One line: `body.page-dobromir { --accent: #f0a040; --accent-dim: rgba(240,160,64,0.08); }`

Sets orange as the accent color when viewing Dobromir analysis.

---

## How It All Connects

Here's the flow for the main user actions:

### Opening the app
1. Browser loads `index.html`
2. `main.js` mounts `App.svelte` into `#app`
3. App.svelte sets body class to `page-scraping` (green theme)
4. App.svelte waits for Google's auth library, then calls `initDrive()`
5. If there's a saved token in sessionStorage, validates it → shows "Connected to Drive ✓"
6. Scraping page renders with upload cards, starts SSE connection for progress

### Uploading a file for immediate scraping
1. User drops `.xlsx` on the Run Now DropZone
2. DropZone validates the extension, calls `onfile` callback
3. Scraping page stores the file reference, enables the upload button
4. User clicks "Upload & Start Scraping"
5. `doRunNowUpload()` calls `uploadFile(file, FOLDERS.input)`
6. Drive API uploads via multipart POST
7. Success: shows ✓ with link to file in Drive

### Viewing single-file analysis
1. User clicks "Analysis" tab → `currentPage` store changes to `'analysis'`
2. App.svelte shows Analysis component, body class changes to `page-sewera` (blue)
3. Analysis.svelte calls `loadFileList()` → `listFiles(FOLDERS.sewera)`
4. Files are sorted by date, rendered as clickable tiles
5. Background preloading starts (3 concurrent downloads/parses)
6. User clicks a tile → `selectFile(id)`
7. `runSingleFileAnalysis()` calls `getAnalysis(file, 'sewera')`
8. Cache checks IndexedDB → miss → downloads file → `parseXlsx()` → `analyzeFile()` → caches result
9. `selectedResult` is set → SingleFile.svelte renders KPIs, charts, tables
10. Chart.js creates distribution and coverage charts on canvas elements

### Viewing trend analysis
1. User clicks "All Files Trend" toggle
2. `setMode('all')` hides file tiles, calls `runAllFilesAnalysis()`
3. All files are analyzed (mostly cache hits by now)
4. `allAnalyses` is set → TrendView.svelte renders
5. Line charts show median and cheapest % over time
6. Multi-line chart shows competitor coverage over time
7. Segment trend table compares first and last files

### Switching branches
1. User clicks "Dobromir" in the branch toggle
2. `currentBranch` store changes → body class changes to `page-dobromir` (orange)
3. `{#key}` block destroys the Sewera Analysis component entirely
4. New Analysis component mounts with `branch="dobromir"`
5. Loads Dobromir's file list from its separate Drive folder
6. Everything else works identically — same charts, same logic, just different data and colors
