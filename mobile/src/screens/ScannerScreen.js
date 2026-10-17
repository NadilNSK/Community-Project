import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import {
  apiRequest,
  getOfflineQueue,
  enqueueOfflineScan,
  clearOfflineQueue,
  getCachedConsignments,
} from '../api/client';

export default function ScannerScreen({ user, transfers, onScanCompleted }) {
  const [permission, requestPermission] = useCameraPermissions();
  const [cameraOpen, setCameraOpen] = useState(false);
  const [torchOn, setTorchOn] = useState(false);
  const [qrInput, setQrInput] = useState('');
  const [scannedConsignment, setScannedConsignment] = useState(null);
  const [receivedQty, setReceivedQty] = useState('');
  const [comments, setComments] = useState('');
  const [offlineMode, setOfflineMode] = useState(false);
  const [offlineQueue, setOfflineQueue] = useState([]);
  const [syncing, setSyncing] = useState(false);
  const [feedback, setFeedback] = useState(null);

  useEffect(() => {
    getOfflineQueue().then(setOfflineQueue);
  }, []);

  const handleOpenCamera = async () => {
    if (!permission?.granted) {
      const res = await requestPermission();
      if (!res.granted) {
        setFeedback({
          type: 'warning',
          text: 'Camera permission is required to scan QR gate passes.',
        });
        return;
      }
    }
    setCameraOpen(true);
  };

  const handleBarcodeScanned = ({ data }) => {
    setCameraOpen(false);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    verifyQrPayload(data);
  };

  const verifyQrPayload = async (rawPayload) => {
    const raw = (rawPayload ?? qrInput).trim();
    if (!raw) return;
    setQrInput(raw);
    setFeedback(null);

    if (offlineMode) {
      const cached = transfers.length > 0 ? transfers : await getCachedConsignments();
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
        setReceivedQty(String(match.dispatchedQty));
        setFeedback({
          type: 'warning',
          text: `Offline Cache Verified: ${match.transferCode}`,
        });
      } else {
        setScannedConsignment({
          transferCode: code,
          garmentStyle: 'Offline Queued Pass',
          dispatchedQty: 0,
          status: 'OFFLINE_PENDING',
        });
        setReceivedQty('');
        setFeedback({
          type: 'warning',
          text: `Offline Mode: ${code} ready to queue locally.`,
        });
      }
      return;
    }

    try {
      const res = await apiRequest('/api/scanner/verify-qr', {
        method: 'POST',
        body: JSON.stringify({ qrPayload: raw }),
      });
      setScannedConsignment(res.consignment);
      setReceivedQty(String(res.consignment.dispatchedQty));
      setFeedback({
        type: 'success',
        text: `Signature Verified: ${res.consignment.transferCode}`,
      });
    } catch (err) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
      setFeedback({ type: 'error', text: err.message });
    }
  };

  const executeGateAction = async (scanType) => {
    const targetPayload = qrInput || scannedConsignment?.transferCode;
    if (!targetPayload) return;

    if (offlineMode) {
      const updatedQueue = await enqueueOfflineScan({
        qrPayload: targetPayload,
        scanType,
        receivedQty: scanType === 'INTAKE_VERIFICATION' ? Number(receivedQty) : null,
        comments,
      });
      setOfflineQueue(updatedQueue);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy).catch(() => {});
      setFeedback({
        type: 'warning',
        text: `Queued offline (${scanType}). Will sync when back online.`,
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
          receivedQty: Number(receivedQty),
          comments,
        };
      }

      const res = await apiRequest(endpoint, {
        method: 'POST',
        body: JSON.stringify(body),
      });

      setScannedConsignment(res.consignment);
      const isDiscrepancy = res.consignment?.status === 'DISCREPANCY';
      Haptics.notificationAsync(
        isDiscrepancy
          ? Haptics.NotificationFeedbackType.Warning
          : Haptics.NotificationFeedbackType.Success
      ).catch(() => {});

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
    if (offlineQueue.length === 0) return;
    setSyncing(true);
    try {
      const res = await apiRequest('/api/scanner/sync', {
        method: 'POST',
        body: JSON.stringify({ queuedScans: offlineQueue }),
      });
      await clearOfflineQueue();
      setOfflineQueue([]);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      setFeedback({
        type: 'success',
        text: `Synced ${res.syncedCount} offline scan(s).`,
      });
      onScanCompleted();
    } catch (err) {
      setFeedback({ type: 'error', text: `Sync failed: ${err.message}` });
    } finally {
      setSyncing(false);
    }
  };

  const canDoGateSecurity =
    !user ||
    ['GATE_SECURITY', 'DISPATCH_OFFICER', 'LOGISTICS_MANAGER', 'SYSTEM_ADMIN'].includes(user.role);
  const canDoReceiving =
    !user ||
    ['RECEIVING_OFFICER', 'GATE_SECURITY', 'LOGISTICS_MANAGER', 'SYSTEM_ADMIN'].includes(user.role);

  const numericVariance =
    scannedConsignment && receivedQty !== ''
      ? Number(receivedQty) - (scannedConsignment.dispatchedQty || 0)
      : 0;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      {/* Offline Queue Synchronization Bar */}
      {offlineQueue.length > 0 && (
        <View style={styles.syncBanner}>
          <View style={styles.syncLeft}>
            <View style={styles.syncIconBox}>
              <Ionicons name="cloud-upload-outline" size={18} color="#818cf8" />
            </View>
            <View>
              <Text style={styles.syncTitle}>{offlineQueue.length} Pending Offline Scan(s)</Text>
              <Text style={styles.syncSub}>Stored locally on terminal</Text>
            </View>
          </View>
          <TouchableOpacity
            style={[styles.syncBtn, offlineMode && { opacity: 0.4 }]}
            disabled={offlineMode || syncing}
            onPress={handleSyncOfflineQueue}
          >
            {syncing ? (
              <ActivityIndicator color="#ffffff" size="small" />
            ) : (
              <Text style={styles.syncBtnText}>Sync Queue</Text>
            )}
          </TouchableOpacity>
        </View>
      )}

      {/* Status Alert Banner */}
      {feedback && (
        <View
          style={[
            styles.feedbackBox,
            feedback.type === 'error'
              ? styles.feedbackError
              : feedback.type === 'warning'
              ? styles.feedbackWarn
              : styles.feedbackSuccess,
          ]}
        >
          <Ionicons
            name={feedback.type === 'error' ? 'alert-circle' : 'checkmark-circle'}
            size={20}
            color="#ffffff"
          />
          <Text style={styles.feedbackText}>{feedback.text}</Text>
        </View>
      )}

      {/* Primary Scanner Card */}
      <View style={styles.scannerCard}>
        <View style={styles.scannerTopRow}>
          <View>
            <Text style={styles.cardTitle}>QR Gate Terminal</Text>
            <Text style={styles.cardSub}>Scan vehicle pass or enter pass code</Text>
          </View>

          <View style={styles.topRightControls}>
            <TouchableOpacity
              style={[styles.modePill, offlineMode ? styles.modeOffline : styles.modeOnline]}
              onPress={() => setOfflineMode(!offlineMode)}
            >
              <View
                style={[
                  styles.modeDot,
                  { backgroundColor: offlineMode ? '#fbbf24' : '#10b981' },
                ]}
              />
              <Text
                style={[
                  styles.modeText,
                  { color: offlineMode ? '#fcd34d' : '#34d399' },
                ]}
              >
                {offlineMode ? 'Offline' : 'Online'}
              </Text>
            </TouchableOpacity>

            {cameraOpen && (
              <TouchableOpacity style={styles.torchBtn} onPress={() => setTorchOn(!torchOn)}>
                <Ionicons name={torchOn ? 'flash' : 'flash-off'} size={16} color="#fbbf24" />
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Camera Trigger or Viewport */}
        {!cameraOpen ? (
          <TouchableOpacity style={styles.launchCameraCard} onPress={handleOpenCamera}>
            <View style={styles.cameraCircle}>
              <Ionicons name="scan" size={26} color="#ffffff" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.launchCamTitle}>Activate Rear QR Scanner</Text>
              <Text style={styles.launchCamSub}>
                Auto-detects Master Transfer QR Gate Passes
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#64748b" />
          </TouchableOpacity>
        ) : (
          <View style={styles.cameraContainer}>
            <CameraView
              style={styles.cameraPreview}
              facing="back"
              enableTorch={torchOn}
              barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
              onBarcodeScanned={handleBarcodeScanned}
            />
            <View style={styles.reticleOverlay}>
              <View style={styles.reticleFrame} />
              <TouchableOpacity
                style={styles.closeCamPill}
                onPress={() => setCameraOpen(false)}
              >
                <Ionicons name="close" size={16} color="#ffffff" />
                <Text style={styles.closeCamText}>Close Camera</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Manual Code Input */}
        <View style={styles.manualRow}>
          <View style={styles.manualInputBox}>
            <Ionicons name="barcode-outline" size={18} color="#64748b" />
            <TextInput
              style={styles.manualInput}
              value={qrInput}
              onChangeText={setQrInput}
              placeholder="Pass ID (e.g. GP-2026-0004)"
              placeholderTextColor="#475569"
              autoCapitalize="characters"
            />
          </View>
          <TouchableOpacity style={styles.loadBtn} onPress={() => verifyQrPayload(qrInput)}>
            <Text style={styles.loadBtnText}>Verify</Text>
          </TouchableOpacity>
        </View>

        {/* Active Shipments Quick-Select Strip */}
        {transfers.length > 0 && (
          <View style={styles.activeStripSection}>
            <Text style={styles.stripLabel}>ACTIVE PASSES</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={styles.stripRow}>
                {transfers.slice(0, 5).map((t) => {
                  const selected = scannedConsignment?.transferCode === t.transferCode;
                  return (
                    <TouchableOpacity
                      key={t.id}
                      style={[styles.passChip, selected && styles.passChipActive]}
                      onPress={() => verifyQrPayload(t.transferCode)}
                    >
                      <Text style={styles.passChipCode}>{t.transferCode}</Text>
                      <Text style={styles.passChipMeta}>
                        {t.dispatchedQty} pcs • {t.status}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </ScrollView>
          </View>
        )}
      </View>

      {/* Consignment Verification & Action Card */}
      {scannedConsignment && (
        <View style={styles.consignCard}>
          <View style={styles.consignTopRow}>
            <View style={{ flex: 1 }}>
              <View style={styles.verifiedBadge}>
                <Ionicons name="shield-checkmark" size={13} color="#34d399" />
                <Text style={styles.verifiedText}>AUTHENTICATED PASS</Text>
              </View>
              <Text style={styles.consignCode}>{scannedConsignment.transferCode}</Text>
              <Text style={styles.consignStyle}>
                {scannedConsignment.garmentStyle} • {scannedConsignment.garmentColor}
              </Text>
            </View>

            <View style={styles.dispatchedBox}>
              <Text style={styles.dispatchedLabel}>DISPATCHED</Text>
              <Text style={styles.dispatchedVal}>
                {scannedConsignment.dispatchedQty}
              </Text>
              <Text style={styles.dispatchedUnit}>PCS</Text>
            </View>
          </View>

          {/* Route Summary Box */}
          <View style={styles.routeBox}>
            <View style={styles.routeItem}>
              <Text style={styles.routeCaption}>ORIGIN</Text>
              <Text style={styles.routeValue} numberOfLines={1}>
                {scannedConsignment.sourceBranch?.branchName || 'Origin Plant'}
              </Text>
            </View>
            <Ionicons name="arrow-forward" size={16} color="#6366f1" />
            <View style={[styles.routeItem, { alignItems: 'flex-end' }]}>
              <Text style={styles.routeCaption}>DESTINATION</Text>
              <Text style={styles.routeValue} numberOfLines={1}>
                {scannedConsignment.destinationBranch?.branchName || 'Destination Plant'}
              </Text>
            </View>
          </View>

          {/* Gate Security Departure / Arrival Buttons */}
          {canDoGateSecurity && (
            <View style={styles.gateBtnGroup}>
              <TouchableOpacity
                style={styles.departBtn}
                onPress={() => executeGateAction('DEPARTURE_OUT')}
              >
                <Ionicons name="log-out-outline" size={20} color="#ffffff" />
                <Text style={styles.gateBtnText}>Gate Out (Departure)</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.arriveBtn}
                onPress={() => executeGateAction('DESTINATION_IN')}
              >
                <Ionicons name="log-in-outline" size={20} color="#38bdf8" />
                <Text style={[styles.gateBtnText, { color: '#38bdf8' }]}>
                  Gate In (Arrival)
                </Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Receiving Bay Physical Count Verification */}
          {canDoReceiving && (
            <View style={styles.receivingSection}>
              <View style={styles.receivingHeader}>
                <Text style={styles.receivingLabel}>PHYSICAL INTAKE COUNT</Text>
                {receivedQty !== '' && (
                  <View
                    style={[
                      styles.variancePill,
                      numericVariance === 0
                        ? styles.varianceMatch
                        : styles.varianceMismatch,
                    ]}
                  >
                    <Text
                      style={[
                        styles.varianceText,
                        { color: numericVariance === 0 ? '#34d399' : '#fb7185' },
                      ]}
                    >
                      {numericVariance === 0
                        ? '100% Match'
                        : `${numericVariance > 0 ? `+${numericVariance}` : numericVariance} PCS Variance`}
                    </Text>
                  </View>
                )}
              </View>

              <TextInput
                style={styles.countInput}
                keyboardType="numeric"
                value={receivedQty}
                onChangeText={setReceivedQty}
                placeholder="0"
                placeholderTextColor="#475569"
              />

              <TextInput
                style={styles.remarksInput}
                value={comments}
                onChangeText={setComments}
                placeholder="Optional receiving remarks or bundle notes..."
                placeholderTextColor="#475569"
              />

              <TouchableOpacity
                style={styles.confirmBtn}
                onPress={() => executeGateAction('INTAKE_VERIFICATION')}
              >
                <Ionicons name="checkmark-done" size={20} color="#ffffff" />
                <Text style={styles.confirmBtnText}>
                  Confirm Intake ({receivedQty || 0} PCS)
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#060913',
  },
  content: {
    padding: 16,
    paddingBottom: 40,
  },
  syncBanner: {
    backgroundColor: '#0D1322',
    borderColor: '#6366f1',
    borderWidth: 1,
    borderRadius: 18,
    padding: 14,
    marginBottom: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  syncLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  syncIconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: 'rgba(99, 102, 241, 0.14)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  syncTitle: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '800',
  },
  syncSub: {
    color: '#64748b',
    fontSize: 11,
  },
  syncBtn: {
    backgroundColor: '#4f46e5',
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 10,
  },
  syncBtnText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '800',
  },
  feedbackBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 14,
    borderRadius: 16,
    marginBottom: 14,
  },
  feedbackSuccess: {
    backgroundColor: '#065f46',
  },
  feedbackWarn: {
    backgroundColor: '#92400e',
  },
  feedbackError: {
    backgroundColor: '#9f1239',
  },
  feedbackText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '700',
    flex: 1,
  },
  scannerCard: {
    backgroundColor: '#0D1322',
    borderColor: '#1E293B',
    borderWidth: 1,
    borderRadius: 22,
    padding: 18,
    marginBottom: 16,
  },
  scannerTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  cardTitle: {
    color: '#ffffff',
    fontSize: 17,
    fontWeight: '800',
  },
  cardSub: {
    color: '#64748b',
    fontSize: 12,
    marginTop: 2,
  },
  topRightControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  modePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 11,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
  },
  modeOnline: {
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    borderColor: 'rgba(16, 185, 129, 0.35)',
  },
  modeOffline: {
    backgroundColor: 'rgba(245, 158, 11, 0.16)',
    borderColor: 'rgba(245, 158, 11, 0.45)',
  },
  modeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  modeText: {
    fontSize: 11,
    fontWeight: '800',
  },
  torchBtn: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: '#151E32',
    alignItems: 'center',
    justifyContent: 'center',
  },
  launchCameraCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: '#060913',
    borderColor: 'rgba(99, 102, 241, 0.35)',
    borderWidth: 1.5,
    borderRadius: 18,
    padding: 16,
    marginBottom: 14,
  },
  cameraCircle: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: '#4f46e5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  launchCamTitle: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '800',
  },
  launchCamSub: {
    color: '#64748b',
    fontSize: 12,
    marginTop: 2,
  },
  cameraContainer: {
    height: 250,
    borderRadius: 18,
    overflow: 'hidden',
    marginBottom: 14,
    position: 'relative',
  },
  cameraPreview: {
    flex: 1,
  },
  reticleOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 18,
    backgroundColor: 'rgba(6, 9, 19, 0.25)',
  },
  reticleFrame: {
    width: 170,
    height: 170,
    borderWidth: 2.5,
    borderColor: '#38bdf8',
    borderRadius: 20,
    marginTop: 10,
  },
  closeCamPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(225, 29, 72, 0.9)',
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
  },
  closeCamText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '800',
  },
  manualRow: {
    flexDirection: 'row',
    gap: 8,
  },
  manualInputBox: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#060913',
    borderColor: '#1E293B',
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 12,
    height: 48,
    gap: 8,
  },
  manualInput: {
    flex: 1,
    color: '#ffffff',
    fontFamily: 'monospace',
    fontSize: 13,
    fontWeight: '700',
  },
  loadBtn: {
    backgroundColor: '#4f46e5',
    paddingHorizontal: 18,
    justifyContent: 'center',
    borderRadius: 14,
  },
  loadBtnText: {
    color: '#ffffff',
    fontWeight: '800',
    fontSize: 13,
  },
  activeStripSection: {
    marginTop: 14,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: '#1E293B',
  },
  stripLabel: {
    color: '#64748b',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.8,
    marginBottom: 8,
  },
  stripRow: {
    flexDirection: 'row',
    gap: 8,
  },
  passChip: {
    backgroundColor: '#060913',
    borderColor: '#1E293B',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  passChipActive: {
    borderColor: '#6366f1',
    backgroundColor: 'rgba(99, 102, 241, 0.14)',
  },
  passChipCode: {
    color: '#e2e8f0',
    fontFamily: 'monospace',
    fontSize: 12,
    fontWeight: '900',
  },
  passChipMeta: {
    color: '#64748b',
    fontSize: 10,
    fontWeight: '600',
    marginTop: 2,
  },
  consignCard: {
    backgroundColor: '#0D1322',
    borderColor: '#1E293B',
    borderWidth: 1,
    borderRadius: 22,
    padding: 18,
  },
  consignTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginBottom: 4,
  },
  verifiedText: {
    color: '#34d399',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.6,
  },
  consignCode: {
    color: '#ffffff',
    fontFamily: 'monospace',
    fontSize: 18,
    fontWeight: '900',
  },
  consignStyle: {
    color: '#94a3b8',
    fontSize: 13,
    fontWeight: '600',
    marginTop: 2,
  },
  dispatchedBox: {
    backgroundColor: '#060913',
    borderColor: '#1E293B',
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 10,
    alignItems: 'center',
  },
  dispatchedLabel: {
    color: '#64748b',
    fontSize: 9,
    fontWeight: '800',
  },
  dispatchedVal: {
    color: '#ffffff',
    fontSize: 20,
    fontWeight: '900',
    fontFamily: 'monospace',
  },
  dispatchedUnit: {
    color: '#818cf8',
    fontSize: 9,
    fontWeight: '800',
  },
  routeBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#060913',
    borderRadius: 14,
    padding: 12,
    marginBottom: 14,
  },
  routeItem: {
    flex: 1,
  },
  routeCaption: {
    color: '#64748b',
    fontSize: 9,
    fontWeight: '800',
  },
  routeValue: {
    color: '#e2e8f0',
    fontSize: 12,
    fontWeight: '700',
    marginTop: 2,
  },
  gateBtnGroup: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 14,
  },
  departBtn: {
    flex: 1,
    backgroundColor: '#0284c7',
    height: 52,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  arriveBtn: {
    flex: 1,
    backgroundColor: 'rgba(14, 165, 233, 0.12)',
    borderColor: 'rgba(14, 165, 233, 0.4)',
    borderWidth: 1,
    height: 52,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  gateBtnText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '800',
  },
  receivingSection: {
    borderTopWidth: 1,
    borderTopColor: '#1E293B',
    paddingTop: 14,
  },
  receivingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  receivingLabel: {
    color: '#94a3b8',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.7,
  },
  variancePill: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 10,
    borderWidth: 1,
  },
  varianceMatch: {
    backgroundColor: 'rgba(16, 185, 129, 0.14)',
    borderColor: 'rgba(16, 185, 129, 0.35)',
  },
  varianceMismatch: {
    backgroundColor: 'rgba(244, 63, 94, 0.16)',
    borderColor: 'rgba(244, 63, 94, 0.4)',
  },
  varianceText: {
    fontSize: 10,
    fontWeight: '800',
  },
  countInput: {
    backgroundColor: '#060913',
    borderColor: '#6366f1',
    borderWidth: 1.5,
    borderRadius: 14,
    paddingVertical: 12,
    color: '#ffffff',
    fontSize: 26,
    fontWeight: '900',
    fontFamily: 'monospace',
    textAlign: 'center',
    marginBottom: 10,
  },
  remarksInput: {
    backgroundColor: '#060913',
    borderColor: '#1E293B',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 11,
    color: '#ffffff',
    fontSize: 13,
    marginBottom: 12,
  },
  confirmBtn: {
    backgroundColor: '#059669',
    height: 54,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  confirmBtnText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '800',
  },
});
