const TOKEN_KEY = 'trendy_jwt_token';
const USER_KEY = 'trendy_auth_user';
const OFFLINE_QUEUE_KEY = 'trendy_pwa_offline_scan_queue';
const CACHED_CONSIGNMENTS_KEY = 'trendy_pwa_cached_consignments';

export function getStoredToken() {
  return localStorage.getItem(TOKEN_KEY);
}

export function getStoredUser() {
  try {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function setAuthSession(token, user) {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function clearAuthSession() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

export async function apiRequest(path, options = {}) {
  const token = getStoredToken();
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(path, {
    ...options,
    headers,
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.error || `Request failed with status ${response.status}`);
  }
  return data;
}

// ============================================================================
// Offline PWA Sync Queue & Local Consignment Cache (Module 03 / NFR4)
// ============================================================================

export function getOfflineQueue() {
  try {
    const raw = localStorage.getItem(OFFLINE_QUEUE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function enqueueOfflineScan(scanItem) {
  const queue = getOfflineQueue();
  const entry = {
    clientScanId: crypto.randomUUID ? crypto.randomUUID() : `offline-${Date.now()}-${Math.random()}`,
    scannedAt: new Date().toISOString(),
    ...scanItem,
  };
  queue.push(entry);
  localStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(queue));
  return entry;
}

export function clearOfflineQueue() {
  localStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify([]));
}

export function cacheConsignmentsLocally(consignments) {
  try {
    localStorage.setItem(CACHED_CONSIGNMENTS_KEY, JSON.stringify(consignments));
  } catch {
    // ignore storage quota errors
  }
}

export function getCachedConsignments() {
  try {
    const raw = localStorage.getItem(CACHED_CONSIGNMENTS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}
