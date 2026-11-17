import React, { useCallback, useEffect, useState } from 'react';
import ScannerModule from './ScannerModule';
import DiscrepancyModule from './DiscrepancyModule';
import VehicleReleased from './gate/VehicleReleased';
import PassRejected from './gate/PassRejected';
import SyncQueue, { useScanQueue } from './gate/SyncQueue';
import Shipments from './gate/Shipments';
import { GateActions, GateBottomNav, GateButton, GateFrame, GateHeader, GateNotice } from './gate/GateUI';
import { navigateGate } from './gate/gateRoutes';
import { apiRequest, cacheConsignmentsLocally, getCachedConsignments } from '../api/client';
import { releasedFromTransfer, rejectedFromTransfer, supervisorPhone } from '../api/gateData';
import { releasedSample, rejectedSample } from '../data/gateSamples';
import './gate/gate.css';

export default function GateOfficerModule({ route, user, onExit, onLogout }) {
  const preview = Boolean(route.preview);
  const screen = route.screen || 'home';
  const [transfers, setTransfers] = useState(() => preview ? [] : getCachedConsignments());
  const [loadError, setLoadError] = useState('');
  const [scanResult, setScanResult] = useState(null);
  const loadTransfers = useCallback(async () => {
    if (preview) return;
    try {
      const data = await apiRequest('/api/transfers');
      setTransfers(data);
      cacheConsignmentsLocally(data);
      setLoadError('');
    } catch {
      setLoadError('Unable to refresh shipments. Showing any saved records.');
    }
  }, [preview]);
  useEffect(() => { loadTransfers(); }, [loadTransfers]);
  const queue = useScanQueue(preview, loadTransfers);
  const onNavigate = (next) => navigateGate(next, route.preview);
  const onGateResult = (type, consignment, signatureValid) => {
    setScanResult({ type, data: type === 'released' ? releasedFromTransfer(consignment) : rejectedFromTransfer(consignment, signatureValid) });
    onNavigate(type);
  };
  const result = preview ? (screen === 'released' ? releasedSample : rejectedSample) : scanResult?.type === screen ? scanResult.data : null;

  if (screen === 'released' && result) return <VehicleReleased data={result} preview={preview} onNavigate={onNavigate} />;
  if (screen === 'rejected' && result) return <PassRejected data={result} preview={preview} phone={supervisorPhone(user)} onNavigate={onNavigate} />;
  if (screen === 'sync') return <SyncQueue key={route.preview || 'live'} preview={preview} previewState={route.preview} queue={queue} transfers={transfers} onNavigate={onNavigate} />;
  if (screen === 'shipments') return <Shipments preview={preview} transfers={transfers} onNavigate={onNavigate} loadError={loadError} onRefresh={loadTransfers} />;

  // Only the minimal destinations needed to connect the assigned screens.
  // The existing scanner and discrepancy module retain their own interfaces.
  return <GateFrame preview={preview}>
    <GateHeader title={screen === 'scan' ? 'Scan Gate Pass' : screen === 'alerts' ? 'Alerts' : screen === 'profile' ? 'Profile' : 'Gate Home'}
      subtitle={user?.branchName || 'TrendyPass · Gate Officer'} onBack={screen !== 'home' ? () => onNavigate('home') : undefined} />
    {screen === 'scan' ? <main className="gate-content gate-portal-scanner">
      <ScannerModule transfers={transfers} onScanCompleted={loadTransfers} onGateResult={onGateResult} previewMode={preview} onOpenSyncQueue={() => onNavigate('sync')} />
    </main> : screen === 'alerts' ? <main className="gate-content gate-portal-scanner">
      <DiscrepancyModule discrepancies={transfers.filter((item) => item.discrepancy).map((item) => ({ ...item.discrepancy, transfer: item }))} onUpdated={loadTransfers} />
    </main> : screen === 'profile' ? <main className="gate-content gate-account">
      <p><strong>{user?.fullName || 'Gate Officer Preview'}</strong></p><p>{user?.branchName || 'Design preview'}</p>
      <p>Supervisor: <a href={`tel:${supervisorPhone(user)}`}>{supervisorPhone(user)}</a></p>
      {user && <GateButton variant="secondary" onClick={onLogout}>Sign out</GateButton>}
      <button type="button" className="underline mt-4" onClick={onExit}>Open existing portal</button>
    </main> : <main className="gate-content gate-home-links">
      {['released', 'rejected'].includes(screen) && <GateNotice tone="warning">Scan a gate pass to view its result.</GateNotice>}
      <GateButton onClick={() => onNavigate('scan')}>Scan a vehicle</GateButton>
      <GateButton variant="secondary" onClick={() => onNavigate('sync')}>Sync queue{!preview && queue.pending.length ? ` · ${queue.pending.length} waiting` : ''}</GateButton>
      <GateButton variant="secondary" onClick={() => onNavigate('shipments')}>Shipments</GateButton>
      {preview && <><p>Design preview · sample records</p><a className="underline" href="#/gate/released?preview=design">Vehicle released</a><a className="underline" href="#/gate/rejected?preview=design">Pass rejected</a><a className="underline" href="#/gate/sync?preview=offline">Offline sync queue</a><a className="underline" href="#/gate/sync?preview=synced">All scans synced</a></>}
    </main>}
    {screen === 'scan' ? <GateActions><GateButton variant="secondary" onClick={() => onNavigate('sync')}>Open sync queue</GateButton></GateActions> : <GateBottomNav active={screen} onNavigate={onNavigate} />}
  </GateFrame>;
}
