import React, { useState, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { apiRequest } from '../api/client';

export default function DispatchScreen({
  user,
  branches,
  vehicles,
  transfers,
  onCreatedPass,
  onOpenPass,
}) {
  const [garmentStyle, setGarmentStyle] = useState('');
  const [garmentColor, setGarmentColor] = useState('');
  const [sizes, setSizes] = useState({ S: 0, M: 0, L: 0, XL: 0 });
  const [sourceBranchId, setSourceBranchId] = useState(
    user?.assignedBranchId || branches[0]?.id || ''
  );
  const [destinationBranchId, setDestinationBranchId] = useState(
    branches.find((b) => b.branchType === 'WASHING')?.id || branches[1]?.id || ''
  );
  const [expectedTransitMinutes, setExpectedTransitMinutes] = useState('120');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const [showInbound, setShowInbound] = useState(true);
  const [yardData, setYardData] = useState({ inYard: [], inbound: [] });

  useEffect(() => {
    let isMounted = true;
    const fetchYard = async () => {
      const branchId = sourceBranchId || branches[0]?.id;
      if (!branchId) return;
      try {
        const res = await apiRequest(`/api/vehicles/available?branchId=${branchId}`);
        if (isMounted && res && Array.isArray(res.inYard)) {
          setYardData(res);
        }
      } catch (err) {
        // Fallback
        const activeTransfers = (transfers || []).filter(
          (t) => t.status !== 'RECEIVED' && t.status !== 'RESOLVED'
        );
        const inYardFallback = (vehicles || [])
          .filter(
            (v) =>
              (v.currentBranchId === branchId || (!v.currentBranchId && branches[0]?.id === branchId)) &&
              !activeTransfers.some((t) => t.vehicleId === v.id)
          )
          .map((v) => ({ ...v, registrationNumber: v.registrationNo, stateDescription: 'Idle / Ready to load' }));
        if (isMounted) {
          setYardData({
            inYard: inYardFallback,
            inbound: [],
          });
        }
      }
    };
    fetchYard();
    return () => {
      isMounted = false;
    };
  }, [sourceBranchId, transfers, vehicles]);

  const inYardVehicles = yardData.inYard;
  const inboundVehicles = yardData.inbound;
  const [vehicleId, setVehicleId] = useState(inYardVehicles[0]?.id || '');

  // Update selected vehicle if current selection becomes unavailable
  useEffect(() => {
    if (inYardVehicles.length > 0 && !inYardVehicles.some((v) => v.id === vehicleId)) {
      setVehicleId(inYardVehicles[0]?.id || '');
    } else if (inYardVehicles.length === 0) {
      setVehicleId('');
    }
  }, [inYardVehicles, vehicleId]);

  const noVehiclesAvailable = inYardVehicles.length === 0;
  const currentBranchName =
    branches.find((b) => b.id === sourceBranchId)?.branchName || user?.branchName || 'Adhikarigama Sewing Plant';

  const totalPieces =
    (Number(sizes.S) || 0) +
    (Number(sizes.M) || 0) +
    (Number(sizes.L) || 0) +
    (Number(sizes.XL) || 0);

  const adjustSize = (sz, delta) => {
    setSizes((prev) => ({
      ...prev,
      [sz]: Math.max(0, (Number(prev[sz]) || 0) + delta),
    }));
  };

  const handleSubmit = async () => {
    if (!garmentStyle.trim() || !garmentColor.trim()) {
      Alert.alert('Missing Specification', 'Please enter garment style and color.');
      return;
    }
    if (totalPieces <= 0) {
      Alert.alert('Invalid Quantity', 'Total piece count must be greater than zero.');
      return;
    }

    // Prevent submission if no vehicle is selected or available
    if (!vehicleId || noVehiclesAvailable) {
      Alert.alert(
        'No Fleet Available',
        'No available fleet vehicles. All assigned vehicles are currently in transit.'
      );
      return;
    }

    const srcId = sourceBranchId || branches[0]?.id;
    const dstId = destinationBranchId || branches[1]?.id;

    if (srcId === dstId) {
      Alert.alert('Invalid Route', 'Source and destination facilities must be different.');
      return;
    }

    setSubmitting(true);
    try {
      const created = await apiRequest('/api/transfers', {
        method: 'POST',
        body: JSON.stringify({
          garmentStyle,
          garmentColor,
          sizeBreakdown: sizes,
          dispatchedQty: totalPieces,
          sourceBranchId: srcId,
          destinationBranchId: dstId,
          vehicleId,
          expectedTransitMinutes: Number(expectedTransitMinutes) || 120,
          notes,
        }),
      });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      setGarmentStyle('');
      setGarmentColor('');
      setSizes({ S: 0, M: 0, L: 0, XL: 0 });
      setNotes('');
      // After successful dispatch, select next available vehicle
      const remaining = availableVehicles.filter((v) => v.id !== vehicleId);
      setVehicleId(remaining[0]?.id || '');
      onCreatedPass(created);
    } catch (err) {
      Alert.alert('Dispatch Error', err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      {/* Section 01: Garment Specification */}
      <View style={styles.sectionCard}>
        <View style={styles.stepHeader}>
          <View style={styles.stepBadge}>
            <Text style={styles.stepBadgeText}>01</Text>
          </View>
          <View>
            <Text style={styles.stepTitle}>Garment Specification</Text>
            <Text style={styles.stepSub}>Style code and wash/color details</Text>
          </View>
        </View>

        <Text style={styles.fieldLabel}>STYLE / PO CODE</Text>
        <View style={styles.inputBox}>
          <Ionicons name="pricetag-outline" size={17} color="#64748b" />
          <TextInput
            style={styles.input}
            value={garmentStyle}
            onChangeText={setGarmentStyle}
            placeholder="e.g., TR-DENIM-501"
            placeholderTextColor="#475569"
          />
        </View>

        <Text style={styles.fieldLabel}>COLOR / WASH VARIANT</Text>
        <View style={styles.inputBox}>
          <Ionicons name="color-palette-outline" size={17} color="#64748b" />
          <TextInput
            style={styles.input}
            value={garmentColor}
            onChangeText={setGarmentColor}
            placeholder="e.g., Raw Indigo"
            placeholderTextColor="#475569"
          />
        </View>
      </View>

      {/* Section 02: Size Matrix */}
      <View style={styles.sectionCard}>
        <View style={styles.stepHeaderBetween}>
          <View style={styles.stepHeaderLeft}>
            <View style={styles.stepBadge}>
              <Text style={styles.stepBadgeText}>02</Text>
            </View>
            <View>
              <Text style={styles.stepTitle}>Size Breakdown</Text>
              <Text style={styles.stepSub}>Piece count per bundle size</Text>
            </View>
          </View>

          <View style={styles.totalPill}>
            <Text style={styles.totalPillVal}>{totalPieces.toLocaleString()} PCS</Text>
          </View>
        </View>

        <View style={styles.sizeGrid}>
          {['S', 'M', 'L', 'XL'].map((sz) => (
            <View key={sz} style={styles.sizeTile}>
              <View style={styles.sizeTileHeader}>
                <Text style={styles.sizeTag}>SIZE {sz}</Text>
                {sizes[sz] > 0 && (
                  <TouchableOpacity onPress={() => setSizes((p) => ({ ...p, [sz]: 0 }))}>
                    <Ionicons name="refresh-outline" size={14} color="#64748b" />
                  </TouchableOpacity>
                )}
              </View>

              <TextInput
                style={styles.sizeValueInput}
                keyboardType="numeric"
                value={String(sizes[sz])}
                onChangeText={(val) =>
                  setSizes((prev) => ({ ...prev, [sz]: Math.max(0, Number(val) || 0) }))
                }
              />

              <View style={styles.stepperRow}>
                <TouchableOpacity style={styles.stepMinus} onPress={() => adjustSize(sz, -50)}>
                  <Text style={styles.stepMinusText}>-50</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.stepPlus} onPress={() => adjustSize(sz, 50)}>
                  <Text style={styles.stepPlusText}>+50</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))}
        </View>
      </View>

      {/* Section 03: Route & Fleet Assignment */}
      <View style={styles.sectionCard}>
        <View style={styles.stepHeader}>
          <View style={styles.stepBadge}>
            <Text style={styles.stepBadgeText}>03</Text>
          </View>
          <View>
            <Text style={styles.stepTitle}>Route & Fleet Assignment</Text>
            <Text style={styles.stepSub}>Origin, destination, and transport vehicle</Text>
          </View>
        </View>

        <Text style={styles.fieldLabel}>ORIGIN FACILITY</Text>
        <View style={styles.chipWrap}>
          {branches.map((b) => {
            const active = (sourceBranchId || branches[0]?.id) === b.id;
            return (
              <TouchableOpacity
                key={b.id}
                style={[styles.plantChip, active && styles.plantChipOrigin]}
                onPress={() => setSourceBranchId(b.id)}
              >
                <Text style={[styles.plantChipText, active && styles.plantChipTextActive]}>
                  {b.branchName}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <Text style={[styles.fieldLabel, { marginTop: 14 }]}>DESTINATION FACILITY</Text>
        <View style={styles.chipWrap}>
          {branches.map((b) => {
            const active = destinationBranchId === b.id;
            return (
              <TouchableOpacity
                key={b.id}
                style={[styles.plantChip, active && styles.plantChipDest]}
                onPress={() => setDestinationBranchId(b.id)}
              >
                <Text style={[styles.plantChipText, active && styles.plantChipTextActive]}>
                  {b.branchName}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <View style={styles.yardHeaderRow}>
          <Text style={styles.fieldLabel}>
            VEHICLES CURRENTLY IN YARD ({currentBranchName.toUpperCase()}):{' '}
            <Text style={{ color: '#34d399', fontWeight: '900' }}>
              {inYardVehicles.length} READY
            </Text>
          </Text>
        </View>

        {noVehiclesAvailable ? (
          <View style={styles.noFleetBanner}>
            <Ionicons name="warning" size={18} color="#f59e0b" />
            <Text style={styles.noFleetText}>
              No fleet vehicles currently parked in this yard. All vehicles are on transit.
            </Text>
          </View>
        ) : (
          <View style={styles.vehicleList}>
            {inYardVehicles.map((v) => {
              const active = (vehicleId || inYardVehicles[0]?.id) === v.id;
              return (
                <TouchableOpacity
                  key={v.id}
                  style={[styles.vehicleCard, active && styles.vehicleCardActive]}
                  onPress={() => setVehicleId(v.id)}
                >
                  <View style={[styles.vehicleIconBox, active && { backgroundColor: '#10b981' }]}>
                    <Ionicons
                      name="bus"
                      size={16}
                      color={active ? '#ffffff' : '#34d399'}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 2 }}>
                      <Text style={styles.vehicleReg}>{v.registrationNo || v.registrationNumber}</Text>
                      <View style={styles.inYardBadge}>
                        <Text style={styles.inYardBadgeText}>In Yard • Ready to Load</Text>
                      </View>
                    </View>
                    <Text style={styles.vehicleDriver}>
                      {v.driverName} • {v.driverPhone}
                    </Text>
                    <Text style={styles.vehicleStateText}>
                      Idle / Ready to load
                    </Text>
                  </View>
                  <Ionicons
                    name={active ? 'radio-button-on' : 'radio-button-off'}
                    size={20}
                    color={active ? '#34d399' : '#334155'}
                  />
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        {inboundVehicles.length > 0 && (
          <View style={{ marginBottom: 14 }}>
            <TouchableOpacity
              style={styles.inboundToggleBtn}
              onPress={() => setShowInbound(!showInbound)}
            >
              <Ionicons
                name={showInbound ? 'chevron-up' : 'chevron-down'}
                size={14}
                color="#94a3b8"
              />
              <Text style={styles.inboundToggleText}>
                Inbound to Yard ({inboundVehicles.length})
              </Text>
            </TouchableOpacity>

            {showInbound && (
              <View style={styles.inboundList}>
                {inboundVehicles.map((v) => (
                  <View key={v.id} style={styles.inboundCard}>
                    <View style={{ flex: 1 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                        <Text style={styles.inboundReg}>
                          {v.registrationNo || v.registrationNumber} ({v.driverName})
                        </Text>
                        <View style={styles.inboundBadge}>
                          <Text style={styles.inboundBadgeText}>
                            In Transit • En Route from {v.originPlant || 'Kuruwita'}
                          </Text>
                        </View>
                      </View>
                      <Text style={styles.inboundEta}>
                        SLA / ETA: {v.activeConsignment?.etaFormatted || 'Expected arrival in ~25 mins'}
                      </Text>
                    </View>
                  </View>
                ))}
              </View>
            )}
          </View>
        )}

        <View style={styles.bottomInputsRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.fieldLabel}>SLA (MINS)</Text>
            <View style={styles.inputBox}>
              <TextInput
                style={styles.input}
                keyboardType="numeric"
                value={expectedTransitMinutes}
                onChangeText={setExpectedTransitMinutes}
              />
            </View>
          </View>
          <View style={{ flex: 2 }}>
            <Text style={styles.fieldLabel}>CONTAINER SEAL / NOTES</Text>
            <View style={styles.inputBox}>
              <TextInput
                style={styles.input}
                value={notes}
                onChangeText={setNotes}
                placeholder="e.g., Seal #SL-90500"
                placeholderTextColor="#475569"
              />
            </View>
          </View>
        </View>

        <TouchableOpacity
          style={[styles.issueBtn, noVehiclesAvailable && styles.issueBtnDisabled]}
          disabled={submitting || noVehiclesAvailable}
          onPress={handleSubmit}
        >
          {submitting ? (
            <ActivityIndicator color="#ffffff" />
          ) : noVehiclesAvailable ? (
            <>
              <Ionicons name="warning" size={18} color="#ffffff" />
              <Text style={styles.issueBtnText}>No Fleet Vehicles Available</Text>
            </>
          ) : (
            <>
              <Ionicons name="qr-code" size={18} color="#ffffff" />
              <Text style={styles.issueBtnText}>
                Issue Gate Pass ({totalPieces.toLocaleString()} PCS)
              </Text>
            </>
          )}
        </TouchableOpacity>
      </View>

      {/* Recent Gate Passes */}
      <Text style={styles.historyTitle}>Issued Gate Passes</Text>
      {transfers.slice(0, 6).map((t) => (
        <TouchableOpacity key={t.id} style={styles.passRow} onPress={() => onOpenPass(t.id)}>
          <View style={styles.passIconBox}>
            <Ionicons name="qr-code-outline" size={18} color="#818cf8" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.passCode}>{t.transferCode}</Text>
            <Text style={styles.passStyle}>
              {t.garmentStyle} • {t.garmentColor}
            </Text>
          </View>
          <View style={styles.passRight}>
            <Text style={styles.passQty}>{t.dispatchedQty.toLocaleString()} pcs</Text>
            <Text style={styles.passPrintLink}>View Pass →</Text>
          </View>
        </TouchableOpacity>
      ))}
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
  sectionCard: {
    backgroundColor: '#0D1322',
    borderColor: '#1E293B',
    borderWidth: 1,
    borderRadius: 22,
    padding: 18,
    marginBottom: 14,
  },
  stepHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  stepHeaderBetween: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  stepHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  stepBadge: {
    width: 34,
    height: 34,
    borderRadius: 11,
    backgroundColor: 'rgba(99, 102, 241, 0.16)',
    borderWidth: 1,
    borderColor: 'rgba(99, 102, 241, 0.35)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepBadgeText: {
    color: '#818cf8',
    fontSize: 12,
    fontWeight: '900',
    fontFamily: 'monospace',
  },
  stepTitle: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '800',
  },
  stepSub: {
    color: '#64748b',
    fontSize: 11,
    marginTop: 1,
  },
  totalPill: {
    backgroundColor: 'rgba(99, 102, 241, 0.18)',
    borderColor: 'rgba(99, 102, 241, 0.4)',
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 12,
  },
  totalPillVal: {
    color: '#a5b4fc',
    fontSize: 12,
    fontWeight: '900',
    fontFamily: 'monospace',
  },
  fieldLabel: {
    color: '#94a3b8',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.7,
    marginBottom: 7,
  },
  inputBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#060913',
    borderColor: '#1E293B',
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 13,
    height: 48,
    gap: 9,
    marginBottom: 12,
  },
  input: {
    flex: 1,
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '600',
  },
  sizeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  sizeTile: {
    width: '48%',
    backgroundColor: '#060913',
    borderColor: '#1E293B',
    borderWidth: 1,
    borderRadius: 16,
    padding: 12,
  },
  sizeTileHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sizeTag: {
    color: '#818cf8',
    fontSize: 11,
    fontWeight: '800',
  },
  sizeValueInput: {
    color: '#ffffff',
    fontSize: 24,
    fontWeight: '900',
    fontFamily: 'monospace',
    textAlign: 'center',
    marginVertical: 6,
  },
  stepperRow: {
    flexDirection: 'row',
    gap: 6,
  },
  stepMinus: {
    flex: 1,
    backgroundColor: '#151E32',
    paddingVertical: 8,
    borderRadius: 10,
    alignItems: 'center',
  },
  stepMinusText: {
    color: '#94a3b8',
    fontSize: 11,
    fontWeight: '800',
  },
  stepPlus: {
    flex: 1,
    backgroundColor: 'rgba(99, 102, 241, 0.22)',
    borderColor: 'rgba(99, 102, 241, 0.4)',
    borderWidth: 1,
    paddingVertical: 8,
    borderRadius: 10,
    alignItems: 'center',
  },
  stepPlusText: {
    color: '#c7d2fe',
    fontSize: 11,
    fontWeight: '800',
  },
  chipWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  plantChip: {
    backgroundColor: '#060913',
    borderColor: '#1E293B',
    borderWidth: 1,
    paddingHorizontal: 13,
    paddingVertical: 9,
    borderRadius: 12,
  },
  plantChipOrigin: {
    backgroundColor: '#4f46e5',
    borderColor: '#6366f1',
  },
  plantChipDest: {
    backgroundColor: '#059669',
    borderColor: '#10b981',
  },
  plantChipText: {
    color: '#94a3b8',
    fontSize: 12,
    fontWeight: '700',
  },
  plantChipTextActive: {
    color: '#ffffff',
    fontWeight: '800',
  },
  vehicleList: {
    gap: 8,
    marginBottom: 14,
  },
  vehicleCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#060913',
    borderColor: '#1E293B',
    borderWidth: 1,
    padding: 12,
    borderRadius: 14,
  },
  vehicleCardActive: {
    borderColor: '#6366f1',
    backgroundColor: 'rgba(79, 70, 229, 0.12)',
  },
  vehicleIconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: 'rgba(99, 102, 241, 0.14)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  vehicleReg: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '800',
  },
  vehicleDriver: {
    color: '#64748b',
    fontSize: 11,
    marginTop: 1,
  },
  vehicleStateText: {
    color: '#94a3b8',
    fontSize: 10,
    fontWeight: '600',
    marginTop: 2,
  },
  yardHeaderRow: {
    marginTop: 14,
    marginBottom: 4,
  },
  inYardBadge: {
    backgroundColor: 'rgba(16, 185, 129, 0.14)',
    borderColor: 'rgba(16, 185, 129, 0.35)',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  inYardBadgeText: {
    color: '#34d399',
    fontSize: 9,
    fontWeight: '800',
  },
  inboundToggleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 4,
  },
  inboundToggleText: {
    color: '#94a3b8',
    fontSize: 11,
    fontWeight: '700',
  },
  inboundList: {
    gap: 8,
    marginTop: 6,
  },
  inboundCard: {
    backgroundColor: 'rgba(13, 19, 34, 0.6)',
    borderColor: '#1E293B',
    borderWidth: 1,
    borderRadius: 14,
    padding: 12,
    opacity: 0.6,
  },
  inboundReg: {
    color: '#cbd5e1',
    fontSize: 12,
    fontWeight: '700',
  },
  inboundBadge: {
    backgroundColor: 'rgba(14, 165, 233, 0.15)',
    borderColor: 'rgba(14, 165, 233, 0.35)',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  inboundBadgeText: {
    color: '#38bdf8',
    fontSize: 9,
    fontWeight: '800',
  },
  inboundEta: {
    color: '#fbbf24',
    fontSize: 10,
    fontWeight: '700',
    marginTop: 2,
  },
  bottomInputsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  issueBtn: {
    backgroundColor: '#4f46e5',
    height: 54,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 4,
  },
  issueBtnDisabled: {
    backgroundColor: '#334155',
    opacity: 0.7,
  },
  issueBtnText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '800',
  },
  noFleetBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: 'rgba(245, 158, 11, 0.12)',
    borderColor: 'rgba(245, 158, 11, 0.35)',
    borderWidth: 1,
    borderRadius: 14,
    padding: 14,
    marginBottom: 14,
  },
  noFleetText: {
    flex: 1,
    color: '#fbbf24',
    fontSize: 12,
    fontWeight: '700',
    lineHeight: 17,
  },
  historyTitle: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '800',
    marginTop: 6,
    marginBottom: 10,
  },
  passRow: {
    backgroundColor: '#0D1322',
    borderColor: '#1E293B',
    borderWidth: 1,
    borderRadius: 16,
    padding: 14,
    marginBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  passIconBox: {
    width: 38,
    height: 38,
    borderRadius: 11,
    backgroundColor: 'rgba(99, 102, 241, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  passCode: {
    color: '#e2e8f0',
    fontFamily: 'monospace',
    fontSize: 13,
    fontWeight: '900',
  },
  passStyle: {
    color: '#64748b',
    fontSize: 12,
    marginTop: 1,
  },
  passRight: {
    alignItems: 'flex-end',
  },
  passQty: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '800',
  },
  passPrintLink: {
    color: '#818cf8',
    fontSize: 11,
    fontWeight: '700',
    marginTop: 2,
  },
});
