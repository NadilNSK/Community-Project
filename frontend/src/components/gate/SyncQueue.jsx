import React, { useEffect, useState } from 'react';
import { getOfflineQueue, getStoredToken, SCAN_QUEUE_CHANGED } from '../../api/client';
import { getSyncedScans, syncOfflineScans } from '../../api/offlineSync';
import { formatGateTime, gateDay, queueRowFromScan } from '../../api/gateData';
import { queuedSamples, syncedSample } from '../../data/gateSamples';
import { CompactRow, DetailsCard, GateActions, GateAsset, GateButton, GateFrame, GateHeader, GateNotice, ResultHeading, StatusChip } from './GateUI';

export function useScanQueue(preview = false, onSynced) {
  const [online, setOnline] = useState(navigator.onLine);
  const [pending, setPending] = useState(getOfflineQueue);
  const [history, setHistory] = useState(getSyncedScans);
  const [syncing, setSyncing] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    const refresh = () => { setPending(getOfflineQueue()); setHistory(getSyncedScans()); };
    const connection = () => setOnline(navigator.onLine);
    window.addEventListener(SCAN_QUEUE_CHANGED, refresh);
    window.addEventListener('storage', refresh);
    window.addEventListener('online', connection);
    window.addEventListener('offline', connection);
    return () => {
      window.removeEventListener(SCAN_QUEUE_CHANGED, refresh);
      window.removeEventListener('storage', refresh);
      window.removeEventListener('online', connection);
      window.removeEventListener('offline', connection);
    };
  }, []);

  useEffect(() => {
    if (preview || !online || !getStoredToken()) return;
    let mounted = true;
    setSyncing(true);
    syncOfflineScans().then((result) => {
      if (!mounted) return;
      if (result.status === 'partial') setMessage(`${result.failedCount} scan(s) could not be accepted. They remain saved for retry.`);
      else setMessage('');
      if (result.syncedCount) onSynced?.();
    }).catch((error) => { if (mounted) setMessage(`Sync failed. Scans remain saved. ${error.message}`); })
      .finally(() => { if (mounted) setSyncing(false); });
    return () => { mounted = false; };
  }, [online, preview, onSynced]);

  const retry = async () => {
    if (!navigator.onLine) { setMessage('Still offline. Your pending scans are safely saved on this device.'); return; }
    setSyncing(true);
    setMessage('');
    try {
      const result = await syncOfflineScans();
      if (result.status === 'partial') setMessage(`${result.failedCount} scan(s) could not be accepted. They remain saved for retry.`);
      if (result.status === 'offline') setMessage('Still offline. Your pending scans are safely saved on this device.');
      if (result.syncedCount) onSynced?.();
    } catch (error) { setMessage(`Sync failed. Scans remain saved. ${error.message}`); }
    finally { setSyncing(false); }
  };
  return { online, pending, history, syncing, message, retry };
}

export default function SyncQueue({ preview, previewState, queue, transfers, onNavigate }) {
  const [previewMessage, setPreviewMessage] = useState('');
  const offlinePreview = preview && previewState !== 'synced';
  const online = preview ? !offlinePreview : queue.online;
  const pending = preview ? (offlinePreview ? queuedSamples : []) : queue.pending.map((scan) => queueRowFromScan(scan, transfers));
  const history = preview ? (offlinePreview ? [syncedSample] : []) : queue.history.map((scan) => queueRowFromScan(scan, transfers));
  const allSynced = online && pending.length === 0;
  const lastUpload = queue.history.reduce((latest, scan) => !latest || scan.syncedAt > latest ? scan.syncedAt : latest, null);
  const lastSyncLabel = preview ? (offlinePreview ? 'Last synced 13:48 · 14 min ago' : 'Last synced 14:31 · just now')
    : lastUpload ? `Last synced ${formatGateTime(lastUpload)}` : 'No uploads from this device yet';
  const syncedToday = preview ? 23 : queue.history.filter((scan) => gateDay(scan.syncedAt) === gateDay(Date.now())).length;
  const message = preview ? previewMessage : queue.message;

  return <GateFrame preview={preview} time={offlinePreview ? '14:02' : '14:31'} offline={!online}>
    {!online && <div className="gate-offline-banner" role="status"><GateAsset name="wifi-off" /><span>No connection — scans are saved on device</span></div>}
    <GateHeader title="Sync Queue" subtitle={lastSyncLabel} onBack={() => onNavigate('home')} className={allSynced ? 'gate-sync-header' : 'gate-queue-header'} />
    <main className={`gate-content ${allSynced ? 'gate-result-content gate-synced-content' : 'gate-queue-content'}`} aria-label="Scan synchronization">
      {allSynced ? <>
        <ResultHeading title="ALL SCANS SYNCED">Nothing is waiting. New scans upload instantly while you're online.</ResultHeading>
        <DetailsCard rows={[
          ['Connection', <StatusChip tone="success" dot>Online</StatusChip>], ['Synced today', `${syncedToday} scans`],
          ['Last upload', preview ? '14:31:08' : formatGateTime(lastUpload, true)], ['Waiting', '0'],
        ]} />
      </> : <>
        <div className="gate-waiting-panel"><strong>{pending.length}</strong><div><h2>SCANS WAITING</h2><p>{online ? 'Ready to upload to the central server' : 'Will upload automatically when signal returns'}</p></div></div>
        <ul className="gate-queue-list" aria-label="Queued and recently synced scans">
          {pending.map((scan) => <CompactRow key={scan.clientScanId} title={scan.transferId} description={scan.description} status="Queued" tone="warning" dot queue />)}
          {history.slice(-1).map((scan) => <CompactRow key={scan.clientScanId} title={scan.transferId} description={scan.description} status="Synced" tone="success" muted queue />)}
        </ul>
      </>}
      {message && <GateNotice tone="warning" role="status">{message}</GateNotice>}
    </main>
    <GateActions roomy={!allSynced}>
      <GateButton onClick={() => onNavigate('scan')}>Keep scanning</GateButton>
      {!allSynced && <GateButton variant="secondary" disabled={!preview && queue.syncing} onClick={preview ? () => setPreviewMessage('Still offline. Your 3 pending scans remain saved on this device.') : queue.retry}>
        {!preview && queue.syncing ? 'Syncing…' : 'Retry sync now'}
      </GateButton>}
    </GateActions>
  </GateFrame>;
}
