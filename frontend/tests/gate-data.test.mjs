import { test } from 'node:test';
import assert from 'node:assert/strict';
import { filterShipments, releasedFromTransfer, rejectedFromTransfer, formatGateTime, gateDay, queueRowFromScan, supervisorPhone } from '../src/api/gateData.js';
import { shipmentSamples } from '../src/data/gateSamples.js';

test('shipment search matches IDs, either end of a route, and vehicle plates', () => {
  assert.deepEqual(filterShipments(shipmentSamples, '  trf 2610 0418  ').map((item) => item.id), ['TRF-2610-0418']);
  assert.deepEqual(filterShipments(shipmentSamples, 'WP LB-4521').map((item) => item.id), ['TRF-2610-0418']);
  assert.deepEqual(filterShipments(shipmentSamples, 'kandy').map((item) => item.id), ['TRF-2610-0411']);
  assert.deepEqual(filterShipments(shipmentSamples, 'Biyagama → Katunayake').map((item) => item.id), ['TRF-2610-0418']);
  assert.equal(filterShipments(shipmentSamples, '').length, 4); assert.equal(filterShipments(shipmentSamples, 'does not exist').length, 0);
});

test('live release uses API fields and computes the arrival in Sri Lankan time', () => {
  const released = releasedFromTransfer({ transferCode: 'GP-live', dispatchTimestamp: '2026-11-17T04:11:12Z', expectedTransitMinutes: 99, dispatchedQty: 520, sourceBranch: { branchName: 'Source' }, destinationBranch: { branchName: 'Destination' }, vehicle: { registrationNo: 'WP LIVE' } });
  assert.equal(released.transferId, 'GP-live'); assert.equal(released.expectedArrival, '11:20');
  assert.equal(released.pieces, 520); assert.equal(released.bundles, undefined); assert.equal(released.receivingGateNotified, false);
});

test('rejection never invents a current vehicle or claims an alert was sent', () => {
  const rejection = rejectedFromTransfer({ transferCode: 'GP-live', dispatchTimestamp: '2026-11-17T04:11:12Z', vehicle: { registrationNo: 'ASSIGNED' } }, true);
  assert.equal(rejection.signatureValid, true); assert.equal(rejection.vehicle, 'Not recorded'); assert.equal(rejection.supervisorsAlerted, false);
});

test('date and time formatting consistently uses Asia/Colombo', () => {
  assert.equal(formatGateTime('2026-11-17T18:40:08Z', true), '00:10:08'); assert.equal(gateDay('2026-11-17T18:40:08Z'), '2026-11-18');
});

test('queue descriptions join the existing JSON QR payload to cached transfers', () => {
  const row = queueRowFromScan({ qrPayload: '{"code":"GP-live"}', scanType: 'INTAKE_VERIFICATION', receivedQty: 640, scannedAt: '2026-11-17T08:21:00Z' }, [{ transferCode: 'GP-live', dispatchedQty: 640, vehicle: { registrationNo: 'LH-8890' } }]);
  assert.equal(row.transferId, 'GP-live'); assert.equal(row.description, 'Entry · LH-8890 · 640/640 pcs · 13:51');
});

test('supervisor contact uses a configured user phone or the requested demo default', () => {
  assert.equal(supervisorPhone({ supervisorPhone: '+94 71 234 5678' }), '+94712345678'); assert.equal(supervisorPhone(), '+94770000000');
  assert.equal(supervisorPhone({ supervisorPhone: 'javascript:alert(1)' }), null);
});
