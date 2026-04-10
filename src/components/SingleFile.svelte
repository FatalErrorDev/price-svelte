<script>
  import { tick } from 'svelte';
  import { BRANCH_CONFIG } from '../lib/parser.js';
  import { createCoverageChart, createDistributionChart } from '../lib/charts.js';

  let { data, branch } = $props();

  let activeProductTab = $state('expensive');

  const pctCheaper = $derived(data ? (data.withComp > 0 ? ((data.cheaper / data.withComp) * 100).toFixed(1) : '0') : '0');
  const pctExpensive = $derived(data ? (data.withComp > 0 ? ((data.expensive / data.withComp) * 100).toFixed(1) : '0') : '0');
  const medianClass = $derived(data && data.median > 0 ? 'amber' : 'accent');
  const sortedSegments = $derived.by(() => {
    if (!data) return [];
    return data.segments.slice().sort((a, b) => {
      const aTotal = a.cheaper + a.expensive;
      const bTotal = b.cheaper + b.expensive;
      return (bTotal > 0 ? b.cheaper / bTotal : 0) - (aTotal > 0 ? a.cheaper / aTotal : 0);
    });
  });

  $effect(() => {
    if (data && branch) {
      tick().then(() => {
        createCoverageChart('chart-coverage-' + branch, data.compCoverage);
        createDistributionChart('chart-dist-' + branch, data.dist);
      });
    }
  });
</script>

{#if data}
  {@const config = BRANCH_CONFIG[branch]}
  {@const covId = 'chart-coverage-' + branch}
  {@const distId = 'chart-dist-' + branch}

  <!-- KPI Cards -->
  <div class="kpi-grid">
    <div class="kpi"><div class="kpi-label">Total products</div><div class="kpi-value">{data.total}</div></div>
    <div class="kpi"><div class="kpi-label">With competitor data</div><div class="kpi-value">{data.withComp}</div></div>
    <div class="kpi"><div class="kpi-label">% cheapest/equal</div><div class="kpi-value accent">{pctCheaper}%</div></div>
    <div class="kpi"><div class="kpi-label">% more expensive</div><div class="kpi-value red">{pctExpensive}%</div></div>
    <div class="kpi"><div class="kpi-label">Median price diff</div><div class="kpi-value {medianClass}">{data.median >= 0 ? '+' : ''}{data.median.toFixed(2)}%</div></div>
    <div class="kpi"><div class="kpi-label">No competitor data</div><div class="kpi-value">{data.noComp}</div></div>
  </div>

  <!-- Charts -->
  <div class="chart-row">
    <div class="chart-card"><h2>Competitor Coverage</h2><div style="height:220px"><canvas id={covId}></canvas></div></div>
    <div class="chart-card"><h2>Price Distribution</h2><div style="height:220px"><canvas id={distId}></canvas></div></div>
  </div>

  <!-- Segment Breakdown -->
  <div class="card" style="margin-bottom:1.5rem">
    <h2>Segment Breakdown</h2>
    {#if data.segments.length === 0}
      <div class="empty-state">No segment data</div>
    {:else}
      {#each sortedSegments as s}
        {@const total = s.cheaper + s.expensive}
        {@const cheaperW = total > 0 ? (s.cheaper / total * 100) : 0}
        {@const expensiveW = total > 0 ? (s.expensive / total * 100) : 0}
        <div class="segment-row">
          <span class="segment-name" title={s.name}>{s.name}</span>
          <div class="segment-bar-wrap">
            <div class="segment-bar-cheaper" style="width:{cheaperW}%"></div>
            <div class="segment-bar-expensive" style="width:{expensiveW}%"></div>
          </div>
          <span class="segment-stats">
            {s.cheaper} cheaper/equal &middot; {s.expensive} expensive &middot; med {s.median.toFixed(1)}%
          </span>
        </div>
      {/each}
    {/if}
  </div>

  <!-- Product Lists -->
  <div class="card">
    <h2>Product Comparison</h2>
    <div class="product-tabs">
      <button class="product-tab" class:active={activeProductTab === 'expensive'} onclick={() => activeProductTab = 'expensive'}>{config.label} najdroższa</button>
      <button class="product-tab" class:active={activeProductTab === 'cheapest'} onclick={() => activeProductTab = 'cheapest'}>{config.label} najtańsza</button>
    </div>

    {#if activeProductTab === 'expensive'}
      {#if data.topExpensive.length === 0}
        <div class="empty-state">No data</div>
      {:else}
        <table class="product-table">
          <thead><tr><th>Product</th><th>Producer</th><th>Diff</th></tr></thead>
          <tbody>
            {#each data.topExpensive as item}
              <tr>
                <td>{item.name}</td>
                <td>{item.producer}</td>
                <td><span class="pct-badge positive">+{item.pct.toFixed(2)}%</span></td>
              </tr>
            {/each}
          </tbody>
        </table>
      {/if}
    {:else}
      {#if data.topCheapest.length === 0}
        <div class="empty-state">No data</div>
      {:else}
        <table class="product-table">
          <thead><tr><th>Product</th><th>Producer</th><th>Diff</th></tr></thead>
          <tbody>
            {#each data.topCheapest as item}
              <tr>
                <td>{item.name}</td>
                <td>{item.producer}</td>
                <td><span class="pct-badge negative">{item.pct.toFixed(2)}%</span></td>
              </tr>
            {/each}
          </tbody>
        </table>
      {/if}
    {/if}
  </div>
{/if}
