import { Chart, registerables } from 'chart.js';

Chart.register(...registerables);

const chartInstances = {};

export const SERIES_COLORS = [
  '#b349da', '#31ac87', '#eee360', '#6150f8',
  '#2b9ebf', '#aa3e3e', '#17c844', '#b57622',
  '#e84393', '#00cec9', '#91ff84', '#a99272',
  '#ff7675', '#55efc4', '#fab1a0', '#74b9ff',
  '#a29bfe', '#fd79a8', '#81ecec', '#ffeaa7'
];

export function destroyChart(canvasId) {
  if (chartInstances[canvasId]) {
    chartInstances[canvasId].destroy();
    delete chartInstances[canvasId];
  }
}

export function destroyAllCharts() {
  Object.keys(chartInstances).forEach(destroyChart);
}

function getChartDefaults() {
  const style = getComputedStyle(document.body);
  return {
    text3: style.getPropertyValue('--text3').trim() || '#555552',
    gridColor: 'rgba(255,255,255,0.05)',
    bg3: style.getPropertyValue('--bg3').trim() || '#1e1e1e',
    accent: style.getPropertyValue('--accent').trim() || '#888884',
    accentDim: style.getPropertyValue('--accent-dim').trim() || 'rgba(136,136,132,0.08)',
    fontMono: "'DM Mono', monospace",
  };
}

export function createDistributionChart(canvasId, distData) {
  destroyChart(canvasId);
  const ctx = document.getElementById(canvasId);
  if (!ctx) return;
  const d = getChartDefaults();

  const colors = [
    '#60a0f0', '#7ab0f0', '#94c0f0', '#b0d0f0',
    '#999999',
    '#f0c080', '#f0a060', '#f06060'
  ];

  chartInstances[canvasId] = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: distData.map((b) => b.label),
      datasets: [{
        data: distData.map((b) => b.count),
        backgroundColor: colors,
        borderRadius: 3,
        maxBarThickness: 40,
      }],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        x: {
          ticks: { color: d.text3, font: { family: d.fontMono, size: 10 } },
          grid: { color: d.gridColor },
        },
        y: {
          ticks: { color: d.text3, font: { family: d.fontMono, size: 10 } },
          grid: { color: d.gridColor },
          beginAtZero: true,
        },
      },
    },
  });
}

export function createCoverageChart(canvasId, compCoverage) {
  destroyChart(canvasId);
  const ctx = document.getElementById(canvasId);
  if (!ctx) return;
  const d = getChartDefaults();

  const entries = Object.entries(compCoverage)
    .sort((a, b) => b[1] - a[1]);
  const labels = entries.map((e) => e[0]);
  const values = entries.map((e) => e[1]);

  const compColors = [
    '#60a0f0', '#f0a040', '#4ecdc4', '#f06060',
    '#c8f060', '#a080f0', '#f060a0', '#80d0f0'
  ];

  chartInstances[canvasId] = new Chart(ctx, {
    type: 'bar',
    data: {
      labels,
      datasets: [{
        data: values,
        backgroundColor: compColors.slice(0, labels.length),
        borderRadius: 3,
        maxBarThickness: 28,
      }],
    },
    options: {
      indexAxis: 'y',
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        x: {
          ticks: { color: d.text3, font: { family: d.fontMono, size: 10 } },
          grid: { color: d.gridColor },
          beginAtZero: true,
        },
        y: {
          ticks: { color: d.text3, font: { family: d.fontMono, size: 11 } },
          grid: { display: false },
        },
      },
    },
  });
}

export function createLineChart(canvasId, labels, values) {
  destroyChart(canvasId);
  const ctx = document.getElementById(canvasId);
  if (!ctx) return;
  const d = getChartDefaults();

  chartInstances[canvasId] = new Chart(ctx, {
    type: 'line',
    data: {
      labels,
      datasets: [{
        data: values,
        borderColor: d.accent,
        backgroundColor: d.accentDim,
        fill: true,
        tension: 0.3,
        pointRadius: 5,
        pointBackgroundColor: d.accent,
        pointBorderColor: d.accent,
      }],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        x: {
          ticks: { color: d.text3, font: { family: d.fontMono, size: 10 } },
          grid: { color: d.gridColor },
        },
        y: {
          ticks: {
            color: d.text3,
            font: { family: d.fontMono, size: 10 },
            callback: (v) => v + '%',
          },
          grid: { color: d.gridColor },
        },
      },
    },
  });
}

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function dateToDayName(dateStr) {
  const parts = dateStr.split('-');
  if (parts.length !== 3) return '';
  const d = new Date(parts[2], parts[1] - 1, parts[0]);
  return isNaN(d.getTime()) ? '' : DAY_NAMES[d.getDay()];
}

export function createSeriesLineChart(canvasId, dates, seriesData) {
  destroyChart(canvasId);
  const ctx = document.getElementById(canvasId);
  if (!ctx) return;
  const d = getChartDefaults();

  const labels = dates.map((dt) => {
    const day = dateToDayName(dt);
    return day ? [dt, day] : [dt];
  });

  const datasets = seriesData.map((s, i) => {
    const color = SERIES_COLORS[i % SERIES_COLORS.length];
    return {
      label: s.name,
      data: s.values,
      borderColor: color,
      backgroundColor: color + '18',
      fill: false,
      tension: 0.3,
      pointRadius: 4,
      pointBackgroundColor: color,
      pointBorderColor: color,
      borderWidth: 2,
    };
  });

  const sumPlugin = {
    id: 'sumTotals',
    afterDraw: (chart) => {
      const ctx2 = chart.ctx;
      const xScale = chart.scales.x;
      const yScale = chart.scales.y;
      ctx2.save();
      ctx2.font = '11px ' + d.fontMono;
      ctx2.fillStyle = d.text3;
      ctx2.textAlign = 'center';
      const numPoints = seriesData.length > 0 ? seriesData[0].values.length : 0;
      for (let i = 0; i < numPoints; i++) {
        let visibleSum = 0;
        chart.data.datasets.forEach((ds, idx) => {
          if (chart.isDatasetVisible(idx)) {
            visibleSum += (ds.data[i] || 0);
          }
        });
        const x = xScale.getPixelForValue(i);
        const y = yScale.top - 6;
        ctx2.fillText(visibleSum, x, y);
      }
      ctx2.restore();
    }
  };

  chartInstances[canvasId] = new Chart(ctx, {
    type: 'line',
    data: { labels, datasets },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      layout: { padding: { top: 20 } },
      plugins: { legend: { display: false } },
      scales: {
        x: {
          ticks: { color: d.text3, font: { family: d.fontMono, size: 10 } },
          grid: { color: d.gridColor },
        },
        y: {
          ticks: { color: d.text3, font: { family: d.fontMono, size: 10 } },
          grid: { color: d.gridColor },
          beginAtZero: true,
        },
      },
    },
    plugins: [sumPlugin],
  });

  return chartInstances[canvasId];
}
