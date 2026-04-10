<script>
  import { onDestroy } from 'svelte';
  import { isSignedIn } from '../lib/stores.js';
  import { BRANCH_CONFIG, extractDate, dateSortKey } from '../lib/parser.js';
  import { listFiles } from '../lib/drive.js';
  import { getAnalysis, preloadAll, preloadProgress } from '../lib/cache.js';
  import { destroyAllCharts } from '../lib/charts.js';
  import SingleFile from '../components/SingleFile.svelte';
  import TrendView from '../components/TrendView.svelte';

  let { branch } = $props();

  let mode = $state('single');
  let files = $state([]);
  let selectedFileId = $state(null);
  let selectedResult = $state(null);
  let allAnalyses = $state(null);
  let loading = $state(false);
  let analyzing = $state(false);
  let errorMsg = $state('');

  let cachedFilesMap = {};
  let preloadDoneVisible = $state(false);
  let preloadDoneTimeout = null;

  // Track preload progress for this branch
  let branchPreload = $derived(($preloadProgress)[branch]);

  // Auto-clear "All files cached" message after 3 seconds
  $effect(() => {
    if (branchPreload && !branchPreload.running && branchPreload.done >= branchPreload.total && branchPreload.total > 0) {
      preloadDoneVisible = true;
      clearTimeout(preloadDoneTimeout);
      preloadDoneTimeout = setTimeout(() => { preloadDoneVisible = false; }, 3000);
    }
  });

  // React to branch or sign-in changes
  let prevBranch = null;
  let prevSignedIn = false;

  $effect(() => {
    const signed = $isSignedIn;
    const b = branch;
    if (b !== prevBranch || (signed && !prevSignedIn)) {
      prevBranch = b;
      prevSignedIn = signed;
      resetAndLoad();
    }
  });

  function resetAndLoad() {
    mode = 'single';
    selectedFileId = null;
    selectedResult = null;
    allAnalyses = null;
    errorMsg = '';
    destroyAllCharts();
    if ($isSignedIn) {
      loadFileList();
    } else {
      files = [];
    }
  }

  async function loadFileList() {
    const config = BRANCH_CONFIG[branch];
    if (!config) return;

    loading = true;
    errorMsg = '';
    files = [];

    try {
      const result = await listFiles(config.folderId);
      if (result.length === 0) {
        files = [];
        loading = false;
        return;
      }

      result.forEach((f) => {
        f.date = extractDate(f.name) || '';
      });
      result.sort((a, b) => {
        const da = a.date ? dateSortKey(a.date) : '';
        const db = b.date ? dateSortKey(b.date) : '';
        return da.localeCompare(db);
      });

      files = result;
      cachedFilesMap[branch] = result;

      preloadAll(branch, result);

      // Preload other branch in background
      const otherBranch = branch === 'sewera' ? 'dobromir' : 'sewera';
      const otherConfig = BRANCH_CONFIG[otherBranch];
      if (otherConfig && !cachedFilesMap[otherBranch]) {
        listFiles(otherConfig.folderId).then((otherFiles) => {
          otherFiles.forEach((f) => { f.date = extractDate(f.name) || ''; });
          cachedFilesMap[otherBranch] = otherFiles;
          preloadAll(otherBranch, otherFiles);
        }).catch(() => {});
      }
    } catch (err) {
      errorMsg = err.message;
    } finally {
      loading = false;
    }
  }

  function setMode(newMode) {
    mode = newMode;
    destroyAllCharts();
    selectedResult = null;
    allAnalyses = null;

    if (newMode === 'all') {
      runAllFilesAnalysis();
    } else if (selectedFileId) {
      const file = files.find((f) => f.id === selectedFileId);
      if (file) runSingleFileAnalysis(file);
    }
  }

  function selectFile(fileId) {
    if (selectedFileId === fileId) {
      selectedFileId = null;
      selectedResult = null;
      destroyAllCharts();
      return;
    }
    selectedFileId = fileId;
    const file = files.find((f) => f.id === fileId);
    if (file) runSingleFileAnalysis(file);
  }

  async function runSingleFileAnalysis(file) {
    destroyAllCharts();
    analyzing = true;
    selectedResult = null;
    errorMsg = '';

    try {
      const result = await getAnalysis(file, branch);
      selectedResult = result;
    } catch (err) {
      errorMsg = 'Analysis error: ' + err.message;
    } finally {
      analyzing = false;
    }
  }

  async function runAllFilesAnalysis() {
    if (!files || files.length === 0) return;
    if (files.length < 2) return;

    destroyAllCharts();
    analyzing = true;
    allAnalyses = null;
    errorMsg = '';

    try {
      const results = await Promise.all(files.map((f) => getAnalysis(f, branch)));
      allAnalyses = results;
    } catch (err) {
      errorMsg = 'Analysis error: ' + err.message;
    } finally {
      analyzing = false;
    }
  }

  onDestroy(() => {
    destroyAllCharts();
  });
</script>

<section class="page-section active" id="page-{branch}">
  <div class="analysis-header">
    <h2>{BRANCH_CONFIG[branch]?.label || branch} Analysis</h2>
    <div class="mode-toggle">
      <button class="mode-btn" class:active={mode === 'single'} onclick={() => setMode('single')}>Single File</button>
      <button class="mode-btn" class:active={mode === 'all'} onclick={() => setMode('all')}>All Files Trend</button>
    </div>
  </div>

  <!-- Preload status -->
  <div class="preload-status">
    {#if branchPreload && branchPreload.running}
      <span class="preload-progress">Caching {branchPreload.done}/{branchPreload.total} files…</span>
    {:else if preloadDoneVisible && branchPreload}
      <span class="preload-done">All {branchPreload.total} files cached ✓</span>
    {/if}
  </div>

  <!-- File tiles (single mode only) -->
  {#if mode === 'single'}
    <div id="file-list-{branch}">
      {#if !$isSignedIn}
        <div class="empty-state">Connect your Google Drive account to load files.</div>
      {:else if loading}
        <div class="loading-state"><span class="spinner"></span> Loading files...</div>
      {:else if errorMsg && files.length === 0}
        <div class="error-msg">{errorMsg}</div>
      {:else if files.length === 0}
        <div class="empty-state">No files found in Drive folder. Drop output files into the correct folder to begin.</div>
      {:else}
        <div class="file-tiles">
          {#each files as f (f.id)}
            <!-- svelte-ignore a11y_no_static_element_interactions -->
            <!-- svelte-ignore a11y_click_events_have_key_events -->
            <div
              class="file-tile"
              class:selected={selectedFileId === f.id}
              onclick={() => selectFile(f.id)}
            >
              <div class="file-tile-date">{f.date || 'No date'}</div>
              <div class="file-tile-name" title={f.name}>{f.name}</div>
            </div>
          {/each}
        </div>
      {/if}
    </div>
  {/if}

  <!-- Results area -->
  <div id="result-{branch}">
    {#if analyzing}
      <div class="loading-state"><span class="spinner"></span> Analyzing...</div>
    {:else if errorMsg && (selectedResult || allAnalyses)}
      <div class="error-msg">{errorMsg}</div>
    {:else if mode === 'single'}
      {#if selectedResult}
        <SingleFile data={selectedResult} {branch} />
      {:else if !loading && files.length > 0}
        <div class="empty-state">Select a file above to run analysis.</div>
      {:else if !$isSignedIn}
        <!-- empty, handled above -->
      {/if}
    {:else if mode === 'all'}
      {#if allAnalyses && allAnalyses.length >= 2}
        <TrendView analyses={allAnalyses} {branch} />
      {:else if files.length < 2 && !loading}
        <div class="empty-state">Need at least 2 files for trend analysis. {files.length === 1 ? 'Only 1 file found.' : 'No files available.'}</div>
      {:else if !$isSignedIn}
        <div class="empty-state">Connect your Google Drive account to load files.</div>
      {/if}
    {/if}
  </div>
</section>
