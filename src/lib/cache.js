import { writable } from 'svelte/store';
import { downloadFile } from './drive.js';
import { parseXlsx, analyzeFile } from './parser.js';

const DB_NAME = 'price-intel-cache';
const DB_VERSION = 1;
const STORE_NAME = 'analyses';
const CACHE_VERSION = 2;

let db = null;
const memoryCache = {};
const pending = {};

export const preloadProgress = writable({});

function openCache() {
  return new Promise((resolve) => {
    if (db) { resolve(db); return; }

    if (!window.indexedDB) {
      console.warn('[cache] IndexedDB not available, using in-memory fallback');
      resolve(null);
      return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (e) => {
      const database = e.target.result;
      if (!database.objectStoreNames.contains(STORE_NAME)) {
        const store = database.createObjectStore(STORE_NAME, { keyPath: 'fileId' });
        store.createIndex('branch', 'branch', { unique: false });
      }
    };

    request.onsuccess = (e) => {
      db = e.target.result;
      resolve(db);
    };

    request.onerror = () => {
      console.warn('[cache] IndexedDB open failed, using in-memory fallback');
      resolve(null);
    };
  });
}

function getCachedResult(fileId, modifiedTime) {
  return new Promise((resolve) => {
    if (!db) {
      const mem = memoryCache[fileId];
      if (mem && mem.modifiedTime === modifiedTime && mem.cacheVersion === CACHE_VERSION) {
        resolve(mem.result);
      } else {
        resolve(null);
      }
      return;
    }

    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const request = store.get(fileId);

    request.onsuccess = () => {
      const record = request.result;
      if (record && record.modifiedTime === modifiedTime && record.cacheVersion === CACHE_VERSION) {
        resolve(record.result);
      } else {
        resolve(null);
      }
    };

    request.onerror = () => {
      resolve(null);
    };
  });
}

function setCachedResult(fileId, modifiedTime, branch, result) {
  const record = {
    fileId,
    modifiedTime,
    branch,
    result,
    cacheVersion: CACHE_VERSION,
    cachedAt: new Date().toISOString(),
  };

  if (!db) {
    memoryCache[fileId] = record;
    return Promise.resolve();
  }

  return new Promise((resolve) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    store.put(record);
    tx.oncomplete = () => { resolve(); };
    tx.onerror = () => { resolve(); };
  });
}

export function getAnalysis(file, branch) {
  if (pending[file.id]) {
    return pending[file.id];
  }

  const p = openCache().then(() => {
    return getCachedResult(file.id, file.modifiedTime);
  }).then((cached) => {
    if (cached) {
      console.log('[cache] HIT: ' + file.name);
      return cached;
    }
    console.log('[cache] MISS: ' + file.name + ' — downloading');
    return downloadFile(file.id).then((buf) => {
      const rows = parseXlsx(buf);
      const result = analyzeFile(rows, branch);
      result.date = file.date;
      result.filename = file.name;
      return setCachedResult(file.id, file.modifiedTime, branch, result).then(() => result);
    });
  }).then((result) => {
    delete pending[file.id];
    return result;
  }, (err) => {
    delete pending[file.id];
    throw err;
  });

  pending[file.id] = p;
  return p;
}

export function preloadAll(branch, files) {
  if (!files || files.length === 0) return Promise.resolve();

  const CONCURRENCY = 3;
  const progress = { done: 0, total: files.length, running: true };

  preloadProgress.update((p) => ({ ...p, [branch]: { ...progress } }));

  function onDone(file, err) {
    if (err) console.warn('[cache] Preload failed for ' + file.name + ':', err.message);
    progress.done++;
    preloadProgress.update((p) => ({ ...p, [branch]: { ...progress } }));
  }

  return openCache().then(() => {
    const queue = files.slice();
    let active = 0;
    return new Promise((resolve) => {
      function next() {
        if (!progress.running) { resolve(); return; }
        while (active < CONCURRENCY && queue.length > 0) {
          const file = queue.shift();
          active++;
          getAnalysis(file, branch)
            .then(() => { onDone(file); })
            .catch((err) => { onDone(file, err); })
            .then(() => { active--; next(); });
        }
        if (active === 0 && queue.length === 0) resolve();
      }
      next();
    });
  }).then(() => {
    progress.running = false;
    preloadProgress.update((p) => ({ ...p, [branch]: { ...progress } }));
  });
}

// Initialize on import
openCache();
