# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Sewera Price Intelligence — a Svelte 5 SPA for price monitoring and scraping control. Uses Vite for building, Google Drive API for file storage, Chart.js for charts, and SheetJS (xlsx) for Excel parsing. Deployed as static files to GitHub Pages.

## Development

```bash
npm install          # Install dependencies
npm run dev          # Dev server at http://localhost:5173
npm run build        # Production build to dist/
npm run preview      # Preview production build
```

## Architecture

### Tech Stack

- **Svelte 5** with runes ($state, $derived, $effect)
- **Vite** build tool
- **Chart.js** (npm) for charts
- **xlsx** (npm, SheetJS) for XLSX parsing
- **Google Identity Services** (CDN script in index.html)

### Project Structure

```
src/
  App.svelte              — Shell: nav + auth + page routing + body class theming
  main.js                 — Entry point, mounts App
  lib/
    constants.js          — Shared constants (DAYS, DAY_LABELS) and capitalize utility
    stores.js             — Svelte stores (currentPage, currentBranch, accessToken, isSignedIn)
    drive.js              — Google Drive API (OAuth2, upload, download, list, delete)
    parser.js             — XLSX parsing & analysis engine, BRANCH_CONFIG
    cache.js              — IndexedDB cache with preload, preloadProgress store
    charts.js             — Chart.js wrappers (distribution, coverage, line, series)
  components/
    Nav.svelte            — Navigation bar + auth bar (combined)
    DropZone.svelte       — Reusable drag-and-drop file input (.xlsx)
    FileChip.svelte       — Selected file chip with remove button
    ScrapingProgress.svelte — SSE-based scraping progress panel
    ScheduledFiles.svelte — Scheduled files day-grid with delete
    SingleFile.svelte     — Single file analysis dashboard (KPIs + charts + tables)
    TrendView.svelte      — Multi-file trend view (line charts + segment table)
    Magnifier.svelte      — Easter egg magnifying glass (Ctrl+Alt+=)
  pages/
    Scraping.svelte       — Scraping page (upload cards + progress + scheduled files)
    Analysis.svelte       — Analysis page (file tiles + mode toggle + dashboard/trend)
  css/
    base.css              — Global styles, layout, components
    scraping.css          — Scraping page accent + scheduled/progress panel styles
    sewera.css            — Sewera accent color
    dobromir.css          — Dobromir accent color
```

### CSS Theming

Page switching works through CSS variables set via body class (managed by `$effect` in App.svelte):
- `body.page-scraping` → green accent (#c8f060)
- `body.page-sewera` → blue accent (#60a0f0)
- `body.page-dobromir` → orange accent (#f0a040)

### Branch Configuration

Sewera and Dobromir differ only in config (`parser.js:BRANCH_CONFIG`): column names, competitor lists, folder IDs, and accent colors.

### Google Drive Folders

10 folder IDs in `src/lib/drive.js`:
- `scraping/input` — immediate uploads
- `scraping/{monday..sunday}` — scheduled uploads
- `analysis/sewera` and `analysis/dobromir` — output files

### Deployment

- **GitHub Actions** workflow (`.github/workflows/deploy.yml`) builds and deploys to Pages on push to `main`
- Set GitHub Pages source to "GitHub Actions" in repo settings
- OAuth client ID is in `<meta name="google-client-id">` in `index.html`
- All 10 folder IDs are in `src/lib/drive.js`
- Must serve over HTTPS (required by Google OAuth)
