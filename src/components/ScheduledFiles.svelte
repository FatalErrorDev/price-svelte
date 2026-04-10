<script>
  import { onMount } from 'svelte';
  import { isSignedIn } from '../lib/stores.js';
  import { listFiles, deleteFile, FOLDERS } from '../lib/drive.js';

  const DAY_ORDER = ['monday','tuesday','wednesday','thursday','friday','saturday','sunday'];
  const DAY_LABELS = {
    monday:'Mon', tuesday:'Tue', wednesday:'Wed',
    thursday:'Thu', friday:'Fri', saturday:'Sat', sunday:'Sun'
  };

  let loading = $state(false);
  let files = $state({});
  let hasError = $state(false);
  let loadError = $state('');

  let prevSignedIn = $state(false);

  // Reload when signing in
  $effect(() => {
    const signed = $isSignedIn;
    if (signed && !prevSignedIn) {
      loadScheduledFiles();
    }
    prevSignedIn = signed;
  });

  // Reload on mount (e.g., when switching back to scraping page)
  onMount(() => {
    if ($isSignedIn) {
      loadScheduledFiles();
    }
  });

  export async function loadScheduledFiles() {
    if (loading) return;
    if (!$isSignedIn) return;

    loading = true;
    hasError = false;
    loadError = '';
    files = {};

    try {
      const results = await Promise.allSettled(
        DAY_ORDER.map((day) =>
          listFiles(FOLDERS[day]).then((dayFiles) =>
            dayFiles.map((f) => ({
              day,
              id: f.id,
              name: f.name,
              modifiedTime: f.modifiedTime,
              webViewLink: f.webViewLink,
            }))
          )
        )
      );

      const byDay = {};
      let partialError = false;

      results.forEach((r, i) => {
        const day = DAY_ORDER[i];
        if (r.status === 'fulfilled') {
          byDay[day] = r.value;
        } else {
          partialError = true;
          byDay[day] = [];
        }
      });

      if (partialError && results.every((r) => r.status === 'rejected')) {
        loadError = 'Failed to load scheduled files.';
      } else {
        hasError = partialError;
      }

      files = byDay;
    } catch (err) {
      loadError = err.message;
    } finally {
      loading = false;
    }
  }

  async function handleDelete(fileId) {
    if (!confirm('Delete this file from Google Drive?')) return;
    try {
      await deleteFile(fileId);
      loadScheduledFiles();
    } catch (err) {
      alert('Delete failed: ' + err.message);
    }
  }

  function formatDate(modifiedTime) {
    return modifiedTime ? new Date(modifiedTime).toLocaleDateString('pl-PL') : '\u2014';
  }
</script>

<div class="card scheduled-files" id="scheduled-files">
  <div class="scheduled-header">
    <h2>Scheduled Files</h2>
    <button class="btn btn-outline btn-sm" onclick={loadScheduledFiles} title="Refresh">&#x21bb;</button>
  </div>

  {#if !$isSignedIn}
    <div class="empty-state">Connect Google Drive to see scheduled files.</div>
  {:else if loading}
    <div class="loading-state"><span class="spinner"></span> Loading scheduled files…</div>
  {:else if loadError}
    <div class="error-msg">{loadError}</div>
  {:else}
    {#if hasError}
      <div class="warning-banner">Some folders could not be loaded.</div>
    {/if}
    <div class="day-grid">
      {#each DAY_ORDER as day}
        {@const dayFiles = files[day] || []}
        <div class="day-slot" class:has-files={dayFiles.length > 0}>
          <span class="day-slot-label">{DAY_LABELS[day]}</span>
          {#if dayFiles.length === 0}
            <span class="day-slot-empty">—</span>
          {:else}
            <div class="day-slot-files">
              {#each dayFiles as file (file.id)}
                <div class="day-file">
                  {#if file.webViewLink}
                    <a class="day-file-name" href={file.webViewLink} target="_blank" rel="noopener noreferrer" title={file.name}>{file.name}</a>
                  {:else}
                    <span class="day-file-name">{file.name}</span>
                  {/if}
                  <div class="day-file-row">
                    <span class="day-file-date">{formatDate(file.modifiedTime)}</span>
                    <button class="day-file-delete" title="Delete file" onclick={() => handleDelete(file.id)}>&times;</button>
                  </div>
                </div>
              {/each}
            </div>
          {/if}
        </div>
      {/each}
    </div>
  {/if}
</div>
