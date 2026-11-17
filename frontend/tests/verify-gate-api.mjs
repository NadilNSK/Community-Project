// Uses a fresh temporary SQLite database. Never seeds or modifies the team's DB.
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readdirSync, unlinkSync, rmdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { once } from 'node:events';
import { enqueueOfflineScan, getOfflineQueue, setAuthSession } from '../src/api/client.js';
import { syncOfflineScans, getSyncedScans } from '../src/api/offlineSync.js';

const require = createRequire(import.meta.url);
const backend = resolve(dirname(fileURLToPath(import.meta.url)), '../../backend');
const temporaryDirectory = mkdtempSync(join(tmpdir(), 'trendypass-gate-test-'));
// Prisma on Windows requires an existing file for some absolute SQLite URLs.
writeFileSync(join(temporaryDirectory, 'gate.db'), '');
process.env.DATABASE_URL = `file:${join(temporaryDirectory, 'gate.db').replaceAll('\\', '/')}`;
process.env.JWT_SECRET = 'gate-verification-only';
process.env.QR_HMAC_SECRET = 'gate-verification-only';

function run(args) {
  const result = spawnSync(process.execPath, args, { cwd: backend, env: process.env, encoding: 'utf8', timeout: 60000, windowsHide: true });
  if (result.stdout) process.stdout.write(result.stdout);
  if (result.status !== 0) throw new Error(result.stderr || result.error?.message || 'Backend check failed');
}

let server;
let prisma;
try {
  run([join(backend, 'node_modules/prisma/build/index.js'), 'db', 'push', '--skip-generate']);
  run(['prisma/seed.js']);

  const app = require(join(backend, 'src/server.js'));
  prisma = require(join(backend, 'src/config/db.js'));
  server = app.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const base = `http://127.0.0.1:${server.address().port}`;
  const networkFetch = globalThis.fetch;
  const request = async (path, body, token) => {
    const response = await networkFetch(base + path, {
      method: body ? 'POST' : 'GET', headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      ...(body ? { body: JSON.stringify(body) } : {}),
    });
    const data = await response.json();
    assert.ok(response.ok, `${path}: ${response.status} ${data.error || ''}`);
    return data;
  };
  const dispatcher = await request('/api/auth/login', { username: 'dispatcher', password: 'password123' });
  const security = await request('/api/auth/login', { username: 'security', password: 'password123' });
  const branches = await request('/api/auth/branches', null, dispatcher.token);
  const sourceBranchId = branches.find((item) => item.branchType === 'SEWING').id;
  const vehicle = await prisma.vehicle.create({ data: {
    registrationNo: 'TEST-QUEUE-001', driverName: 'Test Driver', driverNic: 'TEST-NIC',
    driverPhone: '0000000000', currentBranchId: sourceBranchId, status: 'IN_YARD',
  } });
  const transfer = await request('/api/transfers', {
    garmentStyle: 'Gate queue verification', garmentColor: 'Blue', sizeBreakdown: { M: 100 }, dispatchedQty: 100,
    sourceBranchId,
    destinationBranchId: branches.find((item) => item.branchType === 'WASHING').id,
    vehicleId: vehicle.id, expectedTransitMinutes: 120,
  }, dispatcher.token);

  const storage = new Map();
  globalThis.localStorage = { getItem: (key) => storage.get(key) ?? null, setItem: (key, value) => storage.set(key, value) };
  globalThis.window = new EventTarget();
  Object.defineProperty(globalThis, 'navigator', { configurable: true, value: { onLine: false } });
  setAuthSession(security.token, security.user);
  const original = enqueueOfflineScan({ qrPayload: transfer.qrPayload, scanType: 'DEPARTURE_OUT' });
  const invalid = enqueueOfflineScan({ qrPayload: 'MISSING-TRANSFER', scanType: 'DEPARTURE_OUT' });
  const postedBatches = [];
  globalThis.fetch = (path, options) => { postedBatches.push(JSON.parse(options.body).queuedScans); return networkFetch(base + path, options); };
  await syncOfflineScans(); await syncOfflineScans();
  assert.equal(postedBatches.length, 0); assert.equal(getOfflineQueue().length, 2);

  navigator.onLine = true;
  const [result] = await Promise.all([syncOfflineScans(), syncOfflineScans()]);
  assert.equal(result.syncedCount, 1); assert.equal(result.failedCount, 1); assert.equal(postedBatches.length, 1);
  assert.deepEqual(getOfflineQueue().map((item) => item.clientScanId), [invalid.clientScanId]);
  await syncOfflineScans();
  assert.deepEqual(postedBatches[1].map((item) => item.clientScanId), [invalid.clientScanId]);

  // Simulate an acknowledged upload whose response was lost to the device.
  await request('/api/scanner/sync', { queuedScans: [original] }, security.token);
  assert.equal(await prisma.scanAuditLog.count({ where: { clientScanId: original.clientScanId } }), 1);
  assert.equal(getSyncedScans().length, 1);
  const verified = await request('/api/scanner/verify-qr', { qrPayload: transfer.qrPayload }, security.token);
  assert.equal(verified.verified, true); assert.ok(verified.consignment.dispatchTimestamp);
  assert.equal(verified.consignment.status, 'IN_TRANSIT');
  console.log('Gate API integration passed: offline retention, concurrent retry, partial success, stable IDs, and one audit record per scan.');
} finally {
  if (server) await new Promise((done) => server.close(done));
  if (prisma) await prisma.$disconnect();
  // Verify the exact newly created temp directory before removing its files.
  const root = resolve(tmpdir()) + sep;
  if (resolve(temporaryDirectory).startsWith(root) && temporaryDirectory.includes('trendypass-gate-test-')) {
    for (const name of readdirSync(temporaryDirectory)) unlinkSync(join(temporaryDirectory, name));
    rmdirSync(temporaryDirectory);
  }
}
