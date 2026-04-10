<script>
  import { onMount } from 'svelte';
  import { currentPage, currentBranch } from './lib/stores.js';
  import { initDrive, waitForGSI } from './lib/drive.js';
  import Nav from './components/Nav.svelte';
  import Scraping from './pages/Scraping.svelte';
  import Analysis from './pages/Analysis.svelte';
  import Magnifier from './components/Magnifier.svelte';

  import './css/base.css';
  import './css/scraping.css';
  import './css/sewera.css';
  import './css/dobromir.css';

  // Set body class based on current page/branch
  $effect(() => {
    if ($currentPage === 'scraping') {
      document.body.className = 'page-scraping';
    } else {
      document.body.className = 'page-' + $currentBranch;
    }
  });

  // Generate favicon
  function generateFavicon() {
    const canvas = document.createElement('canvas');
    canvas.width = 32;
    canvas.height = 32;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#0f0f0f';
    ctx.fillRect(0, 0, 32, 32);
    ctx.font = 'bold 18px sans-serif';
    ctx.fillStyle = '#f0ede8';
    ctx.fillText('S', 2, 20);
    ctx.fillStyle = '#c8f060';
    ctx.font = 'bold 14px sans-serif';
    ctx.fillText('//', 14, 20);
    let link = document.querySelector("link[rel='icon']");
    if (!link) {
      link = document.createElement('link');
      link.rel = 'icon';
      document.head.appendChild(link);
    }
    link.href = canvas.toDataURL();
  }

  onMount(async () => {
    generateFavicon();
    await waitForGSI();
    initDrive();
  });
</script>

<Nav />

{#if $currentPage === 'scraping'}
  <Scraping />
{:else}
  {#key $currentBranch}
    <Analysis branch={$currentBranch} />
  {/key}
{/if}

<Magnifier />
