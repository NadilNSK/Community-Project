import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { getOfflineQueue, enqueueOfflineScan, setAuthSession } from '../src/api/client.js';
import { syncOfflineScans, getSyncedScans } from '../src/api/offlineSync.js';

const storage = new Map();
globalThis.localStorage = { getItem: (key) => storage.get(key) ?? null, setItem: (key, value) => storage.set(key, value) };
globalThis.window = new EventTarget();
Object.defineProperty(globalThis, 'navigator', { configurable: true, value: { onLine: true } });
const scan = (id) => enqueueOfflineScan({ clientScanId: id, qrPayload: `GP-${id}`, scanType: 'DEPARTURE_OUT' });
const respond = (results) => ({ ok: true, json: async () => ({ results }) });
const acknowledge = (id, status = 'SYNCED') => ({ clientScanId: id, status });

beforeEach(() => {
  storage.clear(); navigator.onLine = true; delete navigator.locks;
  setAuthSession('test-token', { role: 'GATE_SECURITY' });
  globalThis.fetch = async () => { throw new Error('Unexpected network request'); };
});

test('offline retries preserve every scan and make no requests', async () => {
  scan('one'); scan('two'); navigator.onLine = false;
  const before = getOfflineQueue();
  assert.equal((await syncOfflineScans()).status, 'offline');
  assert.equal((await syncOfflineScans()).status, 'offline');
  assert.deepEqual(getOfflineQueue(), before);
});

test('concurrent retries upload once and later retries do not resend acknowledged scans', async () => {
  scan('one'); let calls = 0; let finish;
  globalThis.fetch = async (path, options) => {
    calls++;
    assert.equal(path, '/api/scanner/sync');
    assert.equal(options.headers.Authorization, 'Bearer test-token');
    assert.equal(JSON.parse(options.body).queuedScans[0].clientScanId, 'one');
    await new Promise((resolve) => { finish = resolve; });
    return respond([acknowledge('one')]);
  };
  const first = syncOfflineScans(); const second = syncOfflineScans();
  assert.equal(first, second); finish(); await Promise.all([first, second]);
  assert.equal((await syncOfflineScans()).status, 'empty');
  assert.equal(calls, 1); assert.equal(getOfflineQueue().length, 0); assert.equal(getSyncedScans().length, 1);
});

test('partial acknowledgements preserve failures, missing results, and scans added during upload', async () => {
  scan('one'); scan('two'); scan('three');
  globalThis.fetch = async () => { scan('new'); return respond([acknowledge('one'), acknowledge('two', 'FAILED'), acknowledge('new')]); };
  const result = await syncOfflineScans();
  assert.equal(result.status, 'partial'); assert.equal(result.failedCount, 2);
  assert.deepEqual(getOfflineQueue().map((item) => item.clientScanId), ['two', 'three', 'new']);
  assert.deepEqual(getSyncedScans().map((item) => item.clientScanId), ['one']);
});

test('a lost response retains the original idempotency ID for a safe retry', async () => {
  scan('one'); const bodies = [];
  globalThis.fetch = async (_path, options) => { bodies.push(JSON.parse(options.body)); throw new Error('Connection lost'); };
  await assert.rejects(syncOfflineScans(), /Connection lost/);
  assert.equal(getOfflineQueue().length, 1);
  globalThis.fetch = async (_path, options) => { bodies.push(JSON.parse(options.body)); return respond([acknowledge('one')]); };
  await syncOfflineScans(); assert.deepEqual(bodies[0], bodies[1]); assert.equal(getOfflineQueue().length, 0);
});

test('an invalid batch response never clears pending scans', async () => {
  scan('one'); globalThis.fetch = async () => ({ ok: true, json: async () => ({ syncedCount: 1 }) });
  await assert.rejects(syncOfflineScans(), /did not acknowledge/); assert.equal(getOfflineQueue().length, 1);
});

test('Web Locks recheck connectivity before starting a cross-tab upload', async () => {
  scan('one');
  navigator.locks = { request: async (name, callback) => { assert.equal(name, 'trendy-pwa-scan-sync'); navigator.onLine = false; return callback(); } };
  assert.equal((await syncOfflineScans()).status, 'offline'); assert.equal(getOfflineQueue().length, 1);
});

test('duplicate local enqueue IDs do not create duplicate pending rows', () => {
  scan('one'); scan('one'); assert.equal(getOfflineQueue().length, 1);
});
