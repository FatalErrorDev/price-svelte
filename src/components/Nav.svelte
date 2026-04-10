<script>
  import { currentPage, currentBranch, isSignedIn } from '../lib/stores.js';
  import { signIn, disconnectDrive } from '../lib/drive.js';

  function switchPage(page) {
    currentPage.set(page);
  }

  function switchBranch(branch) {
    currentBranch.set(branch);
  }
</script>

<nav class="nav">
  <div class="nav-logo">SEWERA <span class="sep">//</span> PRICE INTEL</div>
  <div class="nav-tabs">
    <button
      class="nav-tab"
      class:active={$currentPage === 'scraping'}
      onclick={() => switchPage('scraping')}
    >Scraping</button>
    <button
      class="nav-tab"
      class:active={$currentPage === 'analysis'}
      onclick={() => switchPage('analysis')}
    >Analysis</button>
  </div>
  <div class="branch-toggle" class:visible={$currentPage === 'analysis'}>
    <button
      class="branch-btn"
      class:active={$currentBranch === 'sewera'}
      onclick={() => switchBranch('sewera')}
    >Sewera</button>
    <button
      class="branch-btn"
      class:active={$currentBranch === 'dobromir'}
      onclick={() => switchBranch('dobromir')}
    >Dobromir</button>
  </div>
</nav>

<div class="auth-bar" id="auth-bar">
  {#if $isSignedIn}
    <button class="status-ok" onclick={disconnectDrive} title="Click to disconnect" style="background:none;border:none;cursor:pointer;font-family:inherit;font-size:inherit;padding:0">Connected to Drive ✓</button>
  {:else}
    <button onclick={signIn}>Connect Google Drive</button>
  {/if}
</div>
