import { apiRequest, getOfflineQueue, saveOfflineQueue, SCAN_QUEUE_CHANGED } from './client.js';

const HISTORY_KEY = 'trendy_pwa_synced_scans';
let syncInFlight = null;

export function getSyncedScans() {
  try {
    const history = JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]');
    return Array.isArray(history) ? history : [];
  } catch {
    return [];
  }
}

export function recordSyncedScans(scans, syncedAt = new Date().toISOString()) {
  const history = new Map(getSyncedScans().map((scan) => [scan.clientScanId, scan]));
  for (const scan of scans) {
    if (!history.has(scan.clientScanId)) history.set(scan.clientScanId, { ...scan, syncedAt });
  }
  localStorage.setItem(HISTORY_KEY, JSON.stringify([...history.values()]));
  window.dispatchEvent(new Event(SCAN_QUEUE_CHANGED));
}

// All scanner and queue entry points share this promise. Web Locks also serialize
// sync across tabs. The API's unique clientScanId handles lost-response retries.
export function syncOfflineScans() {
  if (syncInFlight) return syncInFlight;
  if (!navigator.onLine) return Promise.resolve({ status: 'offline', syncedCount: 0 });

  const upload = async () => {
    if (!navigator.onLine) return { status: 'offline', syncedCount: 0 };
    const batch = getOfflineQueue();
    if (!batch.length) return { status: 'empty', syncedCount: 0 };
    const response = await apiRequest('/api/scanner/sync', {
      method: 'POST',
      body: JSON.stringify({ queuedScans: batch }),
    });
    if (!Array.isArray(response.results)) throw new Error('The server did not acknowledge these scans. They remain saved.');
    const submittedIds = new Set(batch.map((scan) => scan.clientScanId));
    const acknowledgedIds = new Set(response.results
      .filter((result) => result.status === 'SYNCED' && submittedIds.has(result.clientScanId))
      .map((result) => result.clientScanId));
    // Persist receipts first. Never clear a failed/unacknowledged scan, or a scan
    // added while this request was in flight. Keep original IDs on every retry.
    if (acknowledgedIds.size) {
      recordSyncedScans(batch.filter((scan) => acknowledgedIds.has(scan.clientScanId)));
      saveOfflineQueue(getOfflineQueue().filter((scan) => !acknowledgedIds.has(scan.clientScanId)));
    }
    return {
      status: acknowledgedIds.size === batch.length ? 'synced' : 'partial',
      syncedCount: acknowledgedIds.size,
      failedCount: batch.length - acknowledgedIds.size,
    };
  };

  syncInFlight = (navigator.locks?.request
    ? navigator.locks.request('trendy-pwa-scan-sync', upload)
    : upload()).finally(() => { syncInFlight = null; });
  return syncInFlight;
}
