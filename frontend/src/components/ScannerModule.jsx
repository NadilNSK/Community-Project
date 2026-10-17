import React, { useState, useEffect, useRef } from 'react';
import {
  Camera,
  CameraOff,
  Wifi,
  WifiOff,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  Truck,
  PackageCheck,
  ShieldCheck,
  QrCode,
} from 'lucide-react';
import { Html5Qrcode } from 'html5-qrcode';
import {
  apiRequest,
  getOfflineQueue,
  enqueueOfflineScan,
  clearOfflineQueue,
  getCachedConsignments,
} from '../api/client';

export default function ScannerModule({ transfers, onScanCompleted }) {
  const [qrInput, setQrInput] = useState('');
  const [scannedConsignment, setScannedConsignment] = useState(null);
  const [receivedQtyInput, setReceivedQtyInput] = useState('');
  const [comments, setComments] = useState('');
  const [cameraActive, setCameraActive] = useState(false);
  const [offlineMode, setOfflineMode] = useState(!navigator.onLine);
  const [offlineQueue, setOfflineQueue] = useState(getOfflineQueue());
  const [syncing, setSyncing] = useState(false);
  const [feedback, setFeedback] = useState(null);
  const html5QrCodeRef = useRef(null);

  useEffect(() => {
    const handleOnline = () => setOfflineMode(false);
    const handleOffline = () => setOfflineMode(true);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      stopCamera();
    };
  }, []);

  const startCamera = async () => {
    setFeedback(null);
    try {
      setCameraActive(true);
      setTimeout(async () => {
        const scanner = new Html5Qrcode('qr-reader-viewport');
        html5QrCodeRef.current = scanner;
        await scanner.start(
          { facingMode: 'environment' },
          { fps: 10, qrbox: { width: 240, height: 240 } },
          (decodedText) => {
            handleVerifyQr(decodedText);
            stopCamera();
          },
          () => {}
        );
      }, 150);
    } catch (err) {
      setCameraActive(false);
      setFeedback({
        type: 'error',
        text: 'Camera unavailable or permission denied. Use the Quick-Scan Demo selector or paste QR code below.',
      });
    }
  };

  const stopCamera = async () => {
    if (html5QrCodeRef.current) {
      try {
        await html5QrCodeRef.current.stop();
        await html5QrCodeRef.current.clear();
      } catch {
        // ignore stop errors
      }
      html5QrCodeRef.current = null;
    }
    setCameraActive(false);
  };

  const handleVerifyQr = async (payloadToVerify) => {
    const raw = (payloadToVerify ?? qrInput).trim();
    if (!raw) return;
    setQrInput(raw);
    setFeedback(null);

    if (offlineMode) {
      // Offline verification against cached consignments (NFR4)
      const cached = transfers.length > 0 ? transfers : getCachedConsignments();
      let code = raw;
      if (raw.startsWith('{')) {
        try {
          code = JSON.parse(raw).code || raw;
        } catch {
          // ignore
        }
      }
      const match = cached.find(
        (c) => c.transferCode === code || c.qrPassHash === code || c.id === code
      );
      if (match) {
        setScannedConsignment(match);
        setReceivedQtyInput(String(match.dispatchedQty));
        setFeedback({
          type: 'info',
          text: `OFFLINE VERIFIED: ${match.transferCode} (${match.dispatchedQty} pcs) loaded from local PWA cache.`,
        });
      } else {
        setFeedback({
          type: 'warning',
          text: `Offline Mode: Consignment '${code}' will be queued locally and verified upon Wi-Fi reconnection.`,
        });
        setScannedConsignment({
          transferCode: code,
          garmentStyle: 'Offline Queued Consignment',
          dispatchedQty: 1500,
          status: 'OFFLINE_PENDING',
        });
        setReceivedQtyInput('1500');
      }
      return;
    }

    try {
      const res = await apiRequest('/api/scanner/verify-qr', {
        method: 'POST',
        body: JSON.stringify({ qrPayload: raw }),
      });
      setScannedConsignment(res.consignment);
      setReceivedQtyInput(String(res.consignment.dispatchedQty));
      setFeedback({
        type: 'success',
        text: `Cryptographic HMAC Signature Verified (SR3): ${res.consignment.transferCode}`,
      });
    } catch (err) {
      setFeedback({ type: 'error', text: err.message });
    }
  };

  const handleGateAction = async (scanType) => {
    if (!qrInput && !scannedConsignment) return;
    const targetPayload = qrInput || scannedConsignment.transferCode;

    // Offline Queue Path (NFR4)
    if (offlineMode) {
      enqueueOfflineScan({
        qrPayload: targetPayload,
        scanType,
        receivedQty: scanType === 'INTAKE_VERIFICATION' ? Number(receivedQtyInput) : null,
        comments,
      });
      setOfflineQueue(getOfflineQueue());
      setFeedback({
        type: 'warning',
        text: `Queued Offline (${scanType}): Saved to device PWA storage. Will auto-sync when factory gate Wi-Fi reconnects.`,
      });
      return;
    }

    try {
      let endpoint = '/api/scanner/gate-out';
      let body = { qrPayload: targetPayload };

      if (scanType === 'DESTINATION_IN') {
        endpoint = '/api/scanner/gate-in';
      } else if (scanType === 'INTAKE_VERIFICATION') {
        endpoint = '/api/scanner/receive';
        body = {
          qrPayload: targetPayload,
          receivedQty: Number(receivedQtyInput),
          comments,
        };
      }

      const res = await apiRequest(endpoint, {
        method: 'POST',
        body: JSON.stringify(body),
      });

      setScannedConsignment(res.consignment);
      const isDiscrepancy = res.consignment?.status === 'DISCREPANCY';
      setFeedback({
        type: isDiscrepancy ? 'error' : 'success',
        text: res.message,
      });
      onScanCompleted();
    } catch (err) {
      setFeedback({ type: 'error', text: err.message });
    }
  };

  const handleSyncOfflineQueue = async () => {
    const queue = getOfflineQueue();
    if (queue.length === 0) return;
    setSyncing(true);
    try {
      const res = await apiRequest('/api/scanner/sync', {
        method: 'POST',
        body: JSON.stringify({ queuedScans: queue }),
      });
      clearOfflineQueue();
      setOfflineQueue([]);
      setFeedback({
        type: 'success',
        text: `Offline PWA Sync Complete: ${res.syncedCount} queued gate scan(s) synchronized with central server!`,
      });
      onScanCompleted();
    } catch (err) {
      setFeedback({ type: 'error', text: `Sync failed: ${err.message}` });
    } finally {
      setSyncing(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header & Offline PWA Toggle Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-slate-900/90 border border-slate-800 rounded-2xl p-5">
        <div>
          <h2 className="text-xl font-bold text-white">
            Gate Scanner & Intake Verification
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Scan Master QR Gate Passes to log vehicle departure, arrival, and received counts
          </p>
        </div>

        {/* Simulated Factory Gate Wi-Fi Toggle */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setOfflineMode((prev) => !prev)}
            className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider border transition cursor-pointer ${
              offlineMode
                ? 'bg-amber-500/20 text-amber-300 border-amber-500/50'
                : 'bg-emerald-500/15 text-emerald-300 border-emerald-500/40'
            }`}
          >
            {offlineMode ? (
              <>
                <WifiOff className="w-4 h-4" />
                Gate Wi-Fi: OFFLINE (Queue Mode)
              </>
            ) : (
              <>
                <Wifi className="w-4 h-4" />
                Gate Wi-Fi: ONLINE
              </>
            )}
          </button>
        </div>
      </div>

      {/* Offline Queue Synchronization Banner (NFR4) */}
      {offlineQueue.length > 0 && (
        <div className="bg-indigo-950/80 border border-indigo-500/40 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h3 className="text-sm font-bold text-indigo-200">
              {offlineQueue.length} Offline Scan Record(s) Queued in Local PWA Storage
            </h3>
            <p className="text-xs text-indigo-300/80 mt-0.5">
              Timestamped gate scans are safely persisted in Service Worker / LocalStorage until Wi-Fi is restored.
            </p>
          </div>
          <button
            type="button"
            disabled={offlineMode || syncing}
            onClick={handleSyncOfflineQueue}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-500 hover:bg-indigo-400 disabled:opacity-40 text-white font-bold text-xs uppercase tracking-wider cursor-pointer"
          >
            <RefreshCw className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`} />
            {offlineMode ? 'Switch Online to Sync' : 'Sync Offline Queue Now'}
          </button>
        </div>
      )}

      {/* Status / Alert Feedback Banner */}
      {feedback && (
        <div
          className={`p-4 rounded-2xl border font-semibold text-sm flex items-center gap-3 ${
            feedback.type === 'error'
              ? 'bg-rose-500/20 border-rose-500/50 text-rose-200'
              : feedback.type === 'warning'
              ? 'bg-amber-500/20 border-amber-500/50 text-amber-200'
              : 'bg-emerald-500/20 border-emerald-500/50 text-emerald-200'
          }`}
        >
          {feedback.type === 'error' ? (
            <AlertTriangle className="w-6 h-6 text-rose-400 shrink-0" />
          ) : (
            <CheckCircle2 className="w-6 h-6 text-emerald-400 shrink-0" />
          )}
          <span>{feedback.text}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Camera QR Reader & Quick Demo Scan Selector */}
        <div className="lg:col-span-5 bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-5">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <QrCode className="w-5 h-5 text-indigo-400" />
              1. Scan Master Gate Pass QR
            </h3>
            {!cameraActive ? (
              <button
                type="button"
                onClick={startCamera}
                className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold cursor-pointer"
              >
                <Camera className="w-4 h-4" />
                Start Camera
              </button>
            ) : (
              <button
                type="button"
                onClick={stopCamera}
                className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold cursor-pointer"
              >
                <CameraOff className="w-4 h-4" />
                Stop Camera
              </button>
            )}
          </div>

          {cameraActive && (
            <div
              id="qr-reader-viewport"
              className="w-full rounded-xl overflow-hidden border-2 border-indigo-500 bg-black min-h-[260px]"
            />
          )}

          {/* Manual / Handheld 2D Barcode Scanner Input */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
              2D Handheld Scanner Input / Gate Pass Code
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={qrInput}
                onChange={(e) => setQrInput(e.target.value)}
                placeholder="e.g., GP-2026-0004 or scan QR payload"
                className="flex-1 px-3.5 py-3 rounded-xl bg-slate-950 border border-slate-800 text-white font-mono text-sm focus:border-indigo-500 focus:outline-none"
              />
              <button
                type="button"
                onClick={() => handleVerifyQr(qrInput)}
                className="px-4 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs uppercase tracking-wider cursor-pointer"
              >
                Verify QR
              </button>
            </div>
          </div>

          {/* Quick-Scan Simulator Buttons for Instant Demo Testing */}
          <div className="pt-2 border-t border-slate-800">
            <div className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
              Quick-Scan Demo Consignments (Tap to Simulate Scan):
            </div>
            <div className="space-y-2">
              {transfers.slice(0, 5).map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => handleVerifyQr(t.transferCode)}
                  className="w-full p-3 rounded-xl bg-slate-950 hover:bg-slate-800 border border-slate-800 flex items-center justify-between text-left transition cursor-pointer"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-indigo-400 text-xs">
                        {t.transferCode}
                      </span>
                      <span className="text-[11px] px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-semibold">
                        {t.status}
                      </span>
                    </div>
                    <div className="text-xs text-slate-300 mt-0.5 truncate max-w-[230px]">
                      {t.garmentStyle}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-extrabold text-white">{t.dispatchedQty} pcs</div>
                    <div className="text-[10px] text-slate-400">{t.vehicle?.registrationNo}</div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column: High-Contrast Glove-Friendly Action Terminal (NFR3) */}
        <div className="lg:col-span-7 bg-slate-900 border border-slate-800 rounded-2xl p-6">
          {scannedConsignment ? (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xl font-black text-indigo-400">
                      {scannedConsignment.transferCode}
                    </span>
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                      <ShieldCheck className="w-3.5 h-3.5" />
                      Authentic QR Pass
                    </span>
                  </div>
                  <h3 className="text-lg font-bold text-white mt-1">
                    {scannedConsignment.garmentStyle} ({scannedConsignment.garmentColor})
                  </h3>
                </div>
                <div className="text-left sm:text-right">
                  <div className="text-xs uppercase text-slate-400">Dispatched Quantity</div>
                  <div className="text-3xl font-black text-white font-mono">
                    {scannedConsignment.dispatchedQty?.toLocaleString()} PCS
                  </div>
                </div>
              </div>

              {/* Route & Vehicle Details */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800">
                  <div className="text-slate-400 uppercase font-semibold">From Source Plant</div>
                  <div className="text-white font-bold mt-1">
                    {scannedConsignment.sourceBranch?.branchName || 'Sewing Plant'}
                  </div>
                </div>
                <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800">
                  <div className="text-slate-400 uppercase font-semibold">To Destination Plant</div>
                  <div className="text-white font-bold mt-1">
                    {scannedConsignment.destinationBranch?.branchName || 'Washing Plant'}
                  </div>
                </div>
                <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800">
                  <div className="text-slate-400 uppercase font-semibold">Vehicle & Driver</div>
                  <div className="text-white font-bold mt-1">
                    {scannedConsignment.vehicle?.registrationNo || 'WP LB-4582'} (
                    {scannedConsignment.vehicle?.driverName || 'Driver'})
                  </div>
                </div>
              </div>

              {/* Step 1: Gate Security Departure / Arrival Buttons (Large Glove-Friendly Targets - NFR3) */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2.5">
                  Gate Security Actions (One-Tap Timestamp Logging — FR3)
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <button
                    type="button"
                    onClick={() => handleGateAction('DEPARTURE_OUT')}
                    className="py-4 px-5 rounded-2xl bg-sky-600 hover:bg-sky-500 text-white font-extrabold text-sm flex items-center justify-center gap-3 shadow-lg shadow-sky-600/25 transition cursor-pointer"
                  >
                    <Truck className="w-6 h-6" />
                    SCAN QR OUT (DEPARTURE GATE)
                  </button>

                  <button
                    type="button"
                    onClick={() => handleGateAction('DESTINATION_IN')}
                    className="py-4 px-5 rounded-2xl bg-slate-800 hover:bg-slate-700 border border-slate-600 text-white font-extrabold text-sm flex items-center justify-center gap-3 transition cursor-pointer"
                  >
                    <CheckCircle2 className="w-6 h-6 text-emerald-400" />
                    SCAN QR IN (DESTINATION GATE)
                  </button>
                </div>
              </div>

              {/* Step 2: Receiving Bay Officer Physical Piece Count Intake (FR4 & FR5) */}
              <div className="pt-4 border-t border-slate-800 space-y-4">
                <label className="block text-xs font-bold uppercase tracking-wider text-indigo-300">
                  Receiving Bay Physical Count Verification (FR4 & FR5 Shortage Check)
                </label>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center">
                  <div>
                    <div className="text-xs text-slate-400 mb-1">
                      Enter Physically Counted Pieces at Receiving Bay:
                    </div>
                    <input
                      type="number"
                      min="0"
                      value={receivedQtyInput}
                      onChange={(e) => setReceivedQtyInput(e.target.value)}
                      className="w-full px-4 py-3.5 rounded-2xl bg-slate-950 border-2 border-indigo-500 text-white font-mono text-2xl font-black focus:outline-none"
                    />
                  </div>

                  {/* Quick Preset Buttons for Demo Testing */}
                  <div className="space-y-2">
                    <div className="text-xs text-slate-400">Quick Count Presets (Glove Friendly):</div>
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => setReceivedQtyInput(String(scannedConsignment.dispatchedQty))}
                        className="px-3 py-2 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border border-emerald-500/30 text-xs font-bold cursor-pointer"
                      >
                        Exact Match ({scannedConsignment.dispatchedQty} pcs)
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          setReceivedQtyInput(String(Math.max(0, scannedConsignment.dispatchedQty - 20)))
                        }
                        className="px-3 py-2 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 border border-rose-500/30 text-xs font-bold cursor-pointer"
                      >
                        Simulate -20 Shortage ({Math.max(0, scannedConsignment.dispatchedQty - 20)} pcs)
                      </button>
                    </div>
                  </div>
                </div>

                <input
                  type="text"
                  value={comments}
                  onChange={(e) => setComments(e.target.value)}
                  placeholder="Optional intake remarks (e.g., Bundle #14 seal broken, 20 pcs missing)"
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-sm"
                />

                <button
                  type="button"
                  onClick={() => handleGateAction('INTAKE_VERIFICATION')}
                  className="w-full py-4 px-6 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-base flex items-center justify-center gap-3 shadow-lg shadow-emerald-600/25 transition cursor-pointer"
                >
                  <PackageCheck className="w-6 h-6" />
                  CONFIRM PHYSICAL COUNT & COMPLETE INTAKE ({receivedQtyInput || 0} PCS)
                </button>
              </div>
            </div>
          ) : (
            <div className="h-full min-h-[340px] flex flex-col items-center justify-center text-center p-6">
              <QrCode className="w-16 h-16 text-slate-700 mb-3" />
              <h3 className="text-lg font-bold text-slate-300">
                Ready to Scan Master Transfer Gate Pass
              </h3>
              <p className="text-xs text-slate-500 max-w-md mt-1">
                Scan a vehicle’s Master QR Pass using your mobile camera or click any of the Quick-Scan Demo Consignments on the left to log Gate Departure or Receiving Intake.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
