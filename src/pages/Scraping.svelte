<script>
  import { isSignedIn } from '../lib/stores.js';
  import { uploadFile, FOLDERS } from '../lib/drive.js';
  import DropZone from '../components/DropZone.svelte';
  import FileChip from '../components/FileChip.svelte';
  import ScheduledFiles from '../components/ScheduledFiles.svelte';
  import ScrapingProgress from '../components/ScrapingProgress.svelte';

  let runNowFile = $state(null);
  let scheduleFile = $state(null);
  let selectedDay = $state(null);
  let runNowResult = $state(null); // { type: 'loading'|'success'|'error', message?, link? }
  let scheduleResult = $state(null);

  let runNowDropZone = $state(null);
  let scheduleDropZone = $state(null);
  let scheduledFilesRef = $state(null);

  function onRunNowFile(file) {
    runNowFile = file;
    runNowResult = null;
  }

  function onScheduleFile(file) {
    scheduleFile = file;
    scheduleResult = null;
  }

  function removeRunNowFile() {
    runNowFile = null;
    runNowResult = null;
    runNowDropZone?.reset();
  }

  function removeScheduleFile() {
    scheduleFile = null;
    scheduleResult = null;
    scheduleDropZone?.reset();
  }

  function selectDay(day) {
    selectedDay = selectedDay === day ? null : day;
  }

  async function doRunNowUpload() {
    if (!runNowFile) return;
    if (!$isSignedIn) {
      runNowResult = { type: 'error', message: 'Please connect Google Drive first.' };
      return;
    }
    runNowResult = { type: 'loading' };
    try {
      const res = await uploadFile(runNowFile, FOLDERS.input);
      runNowResult = { type: 'success', message: 'Uploaded successfully', link: res.webViewLink };
    } catch (err) {
      runNowResult = { type: 'error', message: err.message };
    }
  }

  async function doScheduleUpload() {
    if (!scheduleFile || !selectedDay) return;
    if (!$isSignedIn) {
      scheduleResult = { type: 'error', message: 'Please connect Google Drive first.' };
      return;
    }
    scheduleResult = { type: 'loading' };
    try {
      const res = await uploadFile(scheduleFile, FOLDERS[selectedDay]);
      scheduleResult = {
        type: 'success',
        message: 'Scheduled for ' + selectedDay.charAt(0).toUpperCase() + selectedDay.slice(1),
        link: res.webViewLink,
      };
      scheduledFilesRef?.loadScheduledFiles();
    } catch (err) {
      scheduleResult = { type: 'error', message: err.message };
    }
  }

  function resetRunNow() {
    runNowFile = null;
    runNowResult = null;
    runNowDropZone?.reset();
  }

  function resetSchedule() {
    scheduleFile = null;
    selectedDay = null;
    scheduleResult = null;
    scheduleDropZone?.reset();
  }

  const DAYS = ['monday','tuesday','wednesday','thursday','friday','saturday','sunday'];
  const DAY_SHORT = { monday:'Mon', tuesday:'Tue', wednesday:'Wed', thursday:'Thu', friday:'Fri', saturday:'Sat', sunday:'Sun' };
</script>

<section class="page-section active" id="page-scraping">
  <div class="scraping-grid">

    <!-- Run Now Card -->
    <div class="card">
      <h2>Run Now</h2>
      <p style="color:var(--text2);font-size:0.8rem;margin-bottom:1rem">
        Upload an input file to start scraping immediately.
      </p>
      <DropZone bind:this={runNowDropZone} onfile={onRunNowFile} />
      {#if runNowFile}
        <FileChip name={runNowFile.name} onremove={removeRunNowFile} />
      {/if}
      <div style="margin-top:1rem">
        <button class="btn btn-accent" disabled={!runNowFile} onclick={doRunNowUpload}>
          Upload &amp; Start Scraping
        </button>
      </div>
      {#if runNowResult}
        {#if runNowResult.type === 'loading'}
          <div class="loading-state"><span class="spinner"></span> Uploading...</div>
        {:else if runNowResult.type === 'success'}
          <div class="success-state">
            <span>✓ {runNowResult.message}</span>
            {#if runNowResult.link}
              <a href={runNowResult.link} target="_blank">Open in Drive</a>
            {/if}
            <button class="btn btn-outline" onclick={resetRunNow}>Upload another</button>
          </div>
        {:else if runNowResult.type === 'error'}
          <div class="error-msg">{runNowResult.message}</div>
        {/if}
      {/if}
    </div>

    <!-- Schedule Card -->
    <div class="card">
      <h2>Schedule</h2>
      <p style="color:var(--text2);font-size:0.8rem;margin-bottom:1rem">
        Upload a file to be used on a specific day.
      </p>
      <DropZone bind:this={scheduleDropZone} onfile={onScheduleFile} />
      {#if scheduleFile}
        <FileChip name={scheduleFile.name} onremove={removeScheduleFile} />
      {/if}
      <div class="day-picker">
        {#each DAYS as day}
          <button class="day-btn" class:active={selectedDay === day} onclick={() => selectDay(day)}>{DAY_SHORT[day]}</button>
        {/each}
      </div>
      <div style="margin-top:0.5rem">
        <button class="btn btn-accent" disabled={!(scheduleFile && selectedDay)} onclick={doScheduleUpload}>
          <span>{selectedDay ? 'Schedule for ' + selectedDay.charAt(0).toUpperCase() + selectedDay.slice(1) : 'Schedule upload'}</span>
        </button>
      </div>
      {#if scheduleResult}
        {#if scheduleResult.type === 'loading'}
          <div class="loading-state"><span class="spinner"></span> Uploading...</div>
        {:else if scheduleResult.type === 'success'}
          <div class="success-state">
            <span>✓ {scheduleResult.message}</span>
            {#if scheduleResult.link}
              <a href={scheduleResult.link} target="_blank">Open in Drive</a>
            {/if}
            <button class="btn btn-outline" onclick={resetSchedule}>Schedule another</button>
          </div>
        {:else if scheduleResult.type === 'error'}
          <div class="error-msg">{scheduleResult.message}</div>
        {/if}
      {/if}
    </div>

  </div>

  <ScrapingProgress />
  <ScheduledFiles bind:this={scheduledFilesRef} />
</section>
