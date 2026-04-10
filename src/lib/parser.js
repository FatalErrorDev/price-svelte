import * as XLSX from 'xlsx';
import { FOLDERS } from './drive.js';

export const BRANCH_CONFIG = {
  sewera: {
    label:       'Sewera',
    ownPrice:    'Sewera B2C KTW',
    diffColumn:  'Sewera-Najtańszy',
    competitors: ['Castorama', 'LeroyMerlin', 'OBI', 'Bednarek', 'Lubar', 'Maldrew', 'Viverto'],
    accent:      'sewera',
    folderId:    FOLDERS.sewera,
  },
  dobromir: {
    label:       'Dobromir',
    ownPrice:    'Dobromir',
    diffColumn:  'Dobromir-Najtańszy',
    competitors: ['BricoMarche', 'Castorama'],
    accent:      'dobromir',
    folderId:    FOLDERS.dobromir,
  },
};

export function parseXlsx(arrayBuffer) {
  const workbook = XLSX.read(arrayBuffer, { type: 'array' });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  return XLSX.utils.sheet_to_json(sheet, { defval: '-' });
}

function parsePct(val) {
  if (val === null || val === undefined || val === '-' || val === '' || val === ' ') return null;
  const s = String(val).replace('%', '').replace(',', '.').trim();
  if (s === '' || s === '-') return null;
  const n = parseFloat(s);
  return isNaN(n) ? null : n;
}

function hasPrice(val) {
  return val !== null && val !== undefined && val !== '-' && val !== '' && String(val).trim() !== '' && String(val).trim() !== '-';
}

export function calcMedian(arr) {
  if (arr.length === 0) return 0;
  const sorted = arr.slice().sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

function findCol(row, keys) {
  for (let i = 0; i < keys.length; i++) {
    const val = row[keys[i]];
    if (val !== undefined && val !== null && String(val).trim() !== '' && String(val).trim() !== '-') {
      return String(val);
    }
  }
  for (let j = 0; j < keys.length; j++) {
    const val2 = row[keys[j]];
    if (val2 !== undefined && val2 !== null && String(val2).trim() !== '') {
      return String(val2);
    }
  }
  return '-';
}

export function analyzeFile(rows, branch) {
  const config = BRANCH_CONFIG[branch];
  if (!config) throw new Error('Unknown branch: ' + branch);

  const sampleRow = rows[0] || {};
  const allCols = Object.keys(sampleRow);

  const nameKeys = [];
  const producerKeys = [];
  allCols.forEach((col) => {
    const lc = col.toLowerCase();
    if (lc.indexOf('nazwa') !== -1 || lc.indexOf('name') !== -1 || lc.indexOf('produkt') !== -1 || lc.indexOf('product') !== -1 || lc.indexOf('towar') !== -1 || lc.indexOf('opis') !== -1) {
      nameKeys.push(col);
    }
    if (lc.indexOf('producent') !== -1 || lc.indexOf('producer') !== -1 || lc.indexOf('marka') !== -1 || lc.indexOf('brand') !== -1 || lc.indexOf('dostawca') !== -1) {
      producerKeys.push(col);
    }
  });
  if (nameKeys.length === 0) {
    nameKeys.push(...allCols);
  }

  const total = rows.length;
  let withComp = 0;
  let noComp = 0;
  let cheaper = 0;
  let expensive = 0;
  const diffs = [];
  const compCoverage = {};
  const segmentMap = {};
  const dist = [
    { label: '\u2264-20%', min: -Infinity, max: -20, count: 0 },
    { label: '-20 to -10%', min: -20, max: -10, count: 0 },
    { label: '-10 to -5%', min: -10, max: -5, count: 0 },
    { label: '-5 to 0%', min: -5, max: 0, count: 0 },
    { label: '0%', min: 0, max: 0, count: 0 },
    { label: '0 to 5%', min: 0, max: 5, count: 0 },
    { label: '5 to 15%', min: 5, max: 15, count: 0 },
    { label: '>15%', min: 15, max: Infinity, count: 0 },
  ];

  config.competitors.forEach((c) => { compCoverage[c] = 0; });

  const topExpensiveList = [];
  const topCheapestList = [];

  rows.forEach((row) => {
    const pct = parsePct(row[config.diffColumn]);
    const hasDiff = pct !== null;

    config.competitors.forEach((c) => {
      if (hasPrice(row[c])) compCoverage[c]++;
    });

    if (hasDiff) {
      withComp++;
    } else {
      noComp++;
    }

    if (hasDiff) {
      if (pct <= 0) {
        cheaper++;
      } else {
        expensive++;
      }
    }

    if (hasDiff && pct > -100 && pct < 200) {
      diffs.push(pct);

      if (pct <= -20) dist[0].count++;
      else if (pct <= -10) dist[1].count++;
      else if (pct <= -5) dist[2].count++;
      else if (pct < 0) dist[3].count++;
      else if (pct === 0) dist[4].count++;
      else if (pct <= 5) dist[5].count++;
      else if (pct <= 15) dist[6].count++;
      else dist[7].count++;

      if (pct > 0) {
        topExpensiveList.push({
          name: findCol(row, nameKeys),
          producer: findCol(row, producerKeys),
          pct: pct,
        });
      }

      if (pct < 0) {
        topCheapestList.push({
          name: findCol(row, nameKeys),
          producer: findCol(row, producerKeys),
          pct: pct,
        });
      }
    }

    let segName = row['Segment'] || 'Brak segmentu';
    if (segName === '-') segName = 'Brak segmentu';
    if (!segmentMap[segName]) {
      segmentMap[segName] = { name: segName, total: 0, pricePoints: 0, cheaper: 0, expensive: 0, diffs: [] };
    }
    segmentMap[segName].total++;
    config.competitors.forEach((c) => {
      if (hasPrice(row[c])) segmentMap[segName].pricePoints++;
    });
    if (hasDiff) {
      if (pct <= 0) segmentMap[segName].cheaper++;
      else segmentMap[segName].expensive++;
      if (pct > -100 && pct < 200) segmentMap[segName].diffs.push(pct);
    }
  });

  const segments = Object.values(segmentMap).map((s) => ({
    name: s.name,
    total: s.total,
    pricePoints: s.pricePoints,
    cheaper: s.cheaper,
    expensive: s.expensive,
    median: calcMedian(s.diffs),
  })).sort((a, b) => b.total - a.total);

  topExpensiveList.sort((a, b) => b.pct - a.pct);
  topCheapestList.sort((a, b) => a.pct - b.pct);

  return {
    branch,
    total,
    withComp,
    noComp,
    cheaper,
    expensive,
    median: calcMedian(diffs),
    compCoverage,
    segments,
    dist: dist.map((d) => ({ label: d.label, count: d.count })),
    topExpensive: topExpensiveList.slice(0, 10),
    topCheapest: topCheapestList.slice(0, 10),
  };
}

export function extractDate(filename) {
  const m = filename.match(/(\d{2}-\d{2}-\d{4})/);
  return m ? m[1] : null;
}

export function dateSortKey(dateStr) {
  return dateStr.split('-').reverse().join('');
}

export function escHtml(s) {
  const div = document.createElement('div');
  div.textContent = s;
  return div.innerHTML;
}
