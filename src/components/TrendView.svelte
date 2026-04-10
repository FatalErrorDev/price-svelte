<script>
  import { tick } from 'svelte';
  import { BRANCH_CONFIG } from '../lib/parser.js';
  import { createLineChart, createSeriesLineChart, destroyChart, SERIES_COLORS } from '../lib/charts.js';

  let { analyses, branch } = $props();

  let covMode = $state('competitors');
  let covChart = $state(null);
  let toggleStates = $state([]);

  const first = $derived(analyses[0]);
  const last = $derived(analyses[analyses.length - 1]);

  const medianChange = $derived(last.median - first.median);
  const firstPctCheaper = $derived(first.withComp > 0 ? (first.cheaper / first.withComp * 100) : 0);
  const lastPctCheaper = $derived(last.withComp > 0 ? (last.cheaper / last.withComp * 100) : 0);
  const pctCheapChange = $derived(lastPctCheaper - firstPctCheaper);

  const dates = $derived(analyses.map((a) => a.date || '?'));
  const medians = $derived(analyses.map((a) => a.median));
  const pctCheapers = $derived(analyses.map((a) => a.withComp > 0 ? (a.cheaper / a.withComp * 100) : 0));

  const trendMedId = $derived('chart-trend-median-' + branch);
  const trendCheapId = $derived('chart-trend-cheapest-' + branch);
  const trendCovId = $derived('chart-trend-coverage-' + branch);

  const competitors = $derived(BRANCH_CONFIG[branch] ? BRANCH_CONFIG[branch].competitors : []);

  const compSeries = $derived(competitors.map((comp) => ({
    name: comp,
    values: analyses.map((a) => a.compCoverage ? (a.compCoverage[comp] || 0) : 0),
  })));

  const segNames = $derived.by(() => {
    const names = [];
    analyses.forEach((a) => {
      (a.segments || []).forEach((s) => {
        if (names.indexOf(s.name) === -1) names.push(s.name);
      });
    });
    return names;
  });

  const segSeries = $derived(segNames.map((name) => ({
    name,
    values: analyses.map((a) => {
      const seg = (a.segments || []).find((s) => s.name === name);
      return seg ? seg.pricePoints : 0;
    }),
  })));

  const currentSeries = $derived(covMode === 'segments' ? segSeries : compSeries);

  // Segment trend data
  const segmentTrend = $derived.by(() => {
    const segMap = {};
    first.segments.forEach((s) => { segMap[s.name] = { first: s.median, last: 0 }; });
    last.segments.forEach((s) => {
      if (!segMap[s.name]) segMap[s.name] = { first: 0, last: 0 };
      segMap[s.name].last = s.median;
    });

    return Object.entries(segMap).map(([name, vals]) => ({
      name,
      first: vals.first,
      last: vals.last,
      delta: vals.last - vals.first,
    })).sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta));
  });

  // Create line charts when analyses/branch change
  $effect(() => {
    if (analyses && branch) {
      tick().then(() => {
        createLineChart(trendMedId, dates, medians);
        createLineChart(trendCheapId, dates, pctCheapers);
      });
    }
  });

  // Rebuild coverage chart when series data or covMode changes
  $effect(() => {
    if (analyses && branch && currentSeries) {
      tick().then(() => {
        destroyChart(trendCovId);
        covChart = createSeriesLineChart(trendCovId, dates, currentSeries);
        toggleStates = currentSeries.map(() => true);
      });
    }
  });

  function toggleDataset(idx) {
    toggleStates[idx] = !toggleStates[idx];
    if (covChart) {
      covChart.setDatasetVisibility(idx, toggleStates[idx]);
      covChart.update();
    }
  }

  function toggleAll() {
    const allVisible = toggleStates.every((t) => t);
    const newState = !allVisible;
    toggleStates = toggleStates.map(() => newState);
    if (covChart) {
      toggleStates.forEach((visible, idx) => {
        covChart.setDatasetVisibility(idx, visible);
      });
      covChart.update();
    }
  }

  function switchCovMode(mode) {
    covMode = mode;
  }
</script>

{#if analyses && analyses.length >= 2}
  <!-- Trend KPIs -->
  <div class="kpi-grid">
    <div class="kpi"><div class="kpi-label">Files analyzed</div><div class="kpi-value">{analyses.length}</div></div>
    <div class="kpi"><div class="kpi-label">Median change</div><div class="kpi-value {medianChange > 0 ? 'red' : 'green'}">{medianChange >= 0 ? '+' : ''}{medianChange.toFixed(2)} pp</div></div>
    <div class="kpi"><div class="kpi-label">% cheapest change</div><div class="kpi-value {pctCheapChange >= 0 ? 'green' : 'red'}">{pctCheapChange >= 0 ? '+' : ''}{pctCheapChange.toFixed(1)} pp</div></div>
    <div class="kpi"><div class="kpi-label">Products (latest)</div><div class="kpi-value">{last.total}</div></div>
  </div>

  <!-- Line charts -->
  <div class="chart-row">
    <div class="chart-card"><h2>Median % Over Time</h2><div style="height:250px"><canvas id={trendMedId}></canvas></div></div>
    <div class="chart-card"><h2>% Cheapest Over Time</h2><div style="height:250px"><canvas id={trendCheapId}></canvas></div></div>
  </div>

  <!-- Products over time -->
  <div class="chart-card" style="margin-bottom:1.5rem">
    <div style="display:flex;align-items:center;justify-content:space-between">
      <h2 style="margin:0">Products Scraped Over Time</h2>
      <button class="comp-toggle" style="--comp-color:var(--text3)" onclick={toggleAll}>
        {toggleStates.every((t) => t) ? 'None' : 'All'}
      </button>
    </div>
    <div class="mode-toggle" style="margin-bottom:0.5rem">
      <button class="mode-btn" class:active={covMode === 'competitors'} onclick={() => switchCovMode('competitors')}>Competitors</button>
      <button class="mode-btn" class:active={covMode === 'segments'} onclick={() => switchCovMode('segments')}>Segments</button>
    </div>
    <div class="comp-toggle-row">
      {#each currentSeries as s, i}
        {@const color = SERIES_COLORS[i % SERIES_COLORS.length]}
        <button
          class="comp-toggle"
          class:active={toggleStates[i]}
          style="--comp-color:{color}"
          onclick={() => toggleDataset(i)}
        >{s.name}</button>
      {/each}
    </div>
    <div style="height:280px"><canvas id={trendCovId}></canvas></div>
  </div>

  <!-- Segment Trend Table -->
  <div class="card">
    <h2>Segment Trend (First → Last)</h2>
    {#if segmentTrend.length === 0}
      <div class="empty-state">No segment data</div>
    {:else}
      <table class="trend-table">
        <thead><tr><th>Segment</th><th>First</th><th></th><th>Last</th><th>Delta</th></tr></thead>
        <tbody>
          {#each segmentTrend as e}
            <tr>
              <td>{e.name}</td>
              <td>{e.first.toFixed(1)}%</td>
              <td>→</td>
              <td>{e.last.toFixed(1)}%</td>
              <td class={e.delta > 0 ? 'delta-positive' : 'delta-negative'}>{e.delta > 0 ? '+' : ''}{e.delta.toFixed(1)} pp</td>
            </tr>
          {/each}
        </tbody>
      </table>
    {/if}
  </div>
{/if}
