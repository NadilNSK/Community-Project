import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { handleLocalApiRequest } from './localEngine';

const TOKEN_KEY = '@trendy_jwt_token';
const USER_KEY = '@trendy_auth_user';
const API_URL_KEY = '@trendy_api_base_url';
const OFFLINE_QUEUE_KEY = '@trendy_offline_scan_queue';
const CACHED_CONSIGNMENTS_KEY = '@trendy_cached_consignments';

let memoryToken = null;
let memoryApiUrl = null;
let useStandaloneFallback = false;

const CANDIDATE_URLS = [
  'http://127.0.0.1:4000',
  'http://192.168.178.27:4000',
  'http://10.0.2.2:4000',
];

export function getDefaultApiBaseUrl() {
  const debuggerHost =
    Constants.expoConfig?.hostUri ||
    Constants.manifest2?.extra?.expoGo?.debuggerHost;

  if (debuggerHost) {
    const lanIp = debuggerHost.split(':')[0];
    if (lanIp && lanIp !== 'localhost' && lanIp !== '127.0.0.1') {
      return `http://${lanIp}:4000`;
    }
  }

  if (Platform.OS === 'android') {
    return 'http://127.0.0.1:4000';
  }
  return 'http://localhost:4000';
}

export async function getApiBaseUrl() {
  if (memoryApiUrl) return memoryApiUrl;
  try {
    const stored = await AsyncStorage.getItem(API_URL_KEY);
    if (stored) {
      memoryApiUrl = stored;
      return stored;
    }
  } catch {
    // ignore
  }
  memoryApiUrl = getDefaultApiBaseUrl();
  return memoryApiUrl;
}

export async function setApiBaseUrl(url) {
  const cleaned = url.trim().replace(/\/+$/, '');
  memoryApiUrl = cleaned;
  useStandaloneFallback = cleaned.toLowerCase() === 'standalone';
  await AsyncStorage.setItem(API_URL_KEY, cleaned);
  return cleaned;
}

export async function getStoredSession() {
  try {
    const [token, rawUser] = await Promise.all([
      AsyncStorage.getItem(TOKEN_KEY),
      AsyncStorage.getItem(USER_KEY),
    ]);
    memoryToken = token;
    return {
      token,
      user: rawUser ? JSON.parse(rawUser) : null,
    };
  } catch {
    return { token: null, user: null };
  }
}

export async function saveAuthSession(token, user) {
  memoryToken = token;
  await Promise.all([
    AsyncStorage.setItem(TOKEN_KEY, token),
    AsyncStorage.setItem(USER_KEY, JSON.stringify(user)),
  ]);
}

export async function clearAuthSession() {
  memoryToken = null;
  await Promise.all([
    AsyncStorage.removeItem(TOKEN_KEY),
    AsyncStorage.removeItem(USER_KEY),
  ]);
}

async function fetchWithTimeout(url, options, timeoutMs = 1800) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    return response;
  } catch (err) {
    clearTimeout(timeoutId);
    throw err;
  }
}

export async function apiRequest(path, options = {}) {
  const primaryUrl = await getApiBaseUrl();

  // If already in standalone mode, serve directly from on-device engine with zero delay
  if (useStandaloneFallback || primaryUrl.toLowerCase() === 'standalone') {
    return handleLocalApiRequest(path, options);
  }

  const token = memoryToken || (await AsyncStorage.getItem(TOKEN_KEY));
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const urlsToTry = [
    primaryUrl,
    ...CANDIDATE_URLS.filter((u) => u !== primaryUrl),
  ];

  for (const baseUrl of urlsToTry) {
    try {
      const response = await fetchWithTimeout(
        `${baseUrl}${path}`,
        { ...options, headers },
        1800
      );

      if ([502, 503, 504].includes(response.status)) {
        continue;
      }

      if (baseUrl !== primaryUrl) {
        await setApiBaseUrl(baseUrl);
      }

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data.error || `Request failed (${response.status})`);
      }
      return data;
    } catch (err) {
      if (
        err.message &&
        !err.message.includes('Aborted') &&
        !err.message.includes('Network request failed') &&
        !err.message.includes('Failed to fetch')
      ) {
        throw err;
      }
    }
  }

  // Automatic Standalone On-Device Fallback when laptop backend is off or unreachable!
  useStandaloneFallback = true;
  return handleLocalApiRequest(path, options);
}

// ============================================================================
// Offline Scan Queue & Local Consignment Cache
// ============================================================================

export async function getOfflineQueue() {
  try {
    const raw = await AsyncStorage.getItem(OFFLINE_QUEUE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export async function enqueueOfflineScan(scanItem) {
  const queue = await getOfflineQueue();
  const entry = {
    clientScanId: `mob-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    scannedAt: new Date().toISOString(),
    ...scanItem,
  };
  queue.push(entry);
  await AsyncStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(queue));
  return queue;
}

export async function clearOfflineQueue() {
  await AsyncStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify([]));
}

export async function cacheConsignmentsLocally(consignments) {
  try {
    await AsyncStorage.setItem(CACHED_CONSIGNMENTS_KEY, JSON.stringify(consignments));
  } catch {
    // ignore storage errors
  }
}

export async function getCachedConsignments() {
  try {
    const raw = await AsyncStorage.getItem(CACHED_CONSIGNMENTS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}
