import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { apiRequest } from '../api/client';

export default function DiscrepancyScreen({ discrepancies, onUpdated }) {
  const [filter, setFilter] = useState('ALL');
  const [notesById, setNotesById] = useState({});
  const [updatingId, setUpdatingId] = useState(null);

  const handleStatusUpdate = async (id, resolutionStatus) => {
    setUpdatingId(id);
    try {
      await apiRequest(`/api/discrepancies/${id}/resolve`, {
        method: 'PATCH',
        body: JSON.stringify({
          resolutionStatus,
          comments: notesById[id] || undefined,
        }),
      });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      onUpdated();
    } catch (err) {
      Alert.alert('Update Failed', err.message);
    } finally {
      setUpdatingId(null);
    }
  };

  const filteredList = discrepancies.filter((d) => {
    if (filter === 'ALL') return true;
    return d.resolutionStatus === filter;
  });

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      {/* Status Filter Pills */}
      <View style={styles.filterBar}>
        {[
          { id: 'ALL', label: 'All Alerts' },
          { id: 'OPEN', label: 'Open' },
          { id: 'INVESTIGATING', label: 'Investigating' },
          { id: 'RESOLVED', label: 'Resolved' },
        ].map((item) => {
          const active = filter === item.id;
          return (
            <TouchableOpacity
              key={item.id}
              style={[styles.filterChip, active && styles.filterChipActive]}
              onPress={() => setFilter(item.id)}
            >
              <Text style={[styles.filterText, active && styles.filterTextActive]}>
                {item.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {filteredList.length === 0 ? (
        <View style={styles.emptyCard}>
          <View style={styles.emptyIconCircle}>
            <Ionicons name="checkmark-done" size={28} color="#34d399" />
          </View>
          <Text style={styles.emptyTitle}>No Discrepancies Found</Text>
          <Text style={styles.emptySub}>
            All inter-branch garment shipments match their dispatched piece counts.
          </Text>
        </View>
      ) : (
        filteredList.map((d) => {
          const t = d.transfer || {};
          return (
            <View key={d.id} style={[styles.card, !d.isResolved && styles.cardActiveAlert]}>
              {/* Card Header */}
              <View style={styles.topRow}>
                <View style={styles.codeGroup}>
                  <View
                    style={[
                      styles.alertIconBox,
                      {
                        backgroundColor: d.isResolved
                          ? 'rgba(16, 185, 129, 0.14)'
                          : 'rgba(244, 63, 94, 0.16)',
                      },
                    ]}
                  >
                    <Ionicons
                      name={d.isResolved ? 'checkmark-circle' : 'warning'}
                      size={18}
                      color={d.isResolved ? '#34d399' : '#fb7185'}
                    />
                  </View>
                  <View>
                    <Text style={styles.codeText}>{t.transferCode}</Text>
                    <Text style={styles.styleSub}>
                      {t.garmentStyle} • {t.garmentColor}
                    </Text>
                  </View>
                </View>

                <View
                  style={[
                    styles.statusBadge,
                    d.isResolved ? styles.badgeResolved : styles.badgeOpen,
                  ]}
                >
                  <Text
                    style={[
                      styles.statusBadgeText,
                      { color: d.isResolved ? '#34d399' : '#fb7185' },
                    ]}
                  >
                    {d.resolutionStatus}
                  </Text>
                </View>
              </View>

              {/* Variance Comparison Bar */}
              <View style={styles.varianceCard}>
                <View style={styles.varianceCol}>
                  <Text style={styles.varianceLabel}>DISPATCHED</Text>
                  <Text style={styles.varianceVal}>{t.dispatchedQty}</Text>
                </View>
                <View style={styles.vDivider} />
                <View style={styles.varianceCol}>
                  <Text style={styles.varianceLabel}>RECEIVED</Text>
                  <Text style={[styles.varianceVal, { color: '#fbbf24' }]}>
                    {t.receivedQty}
                  </Text>
                </View>
                <View style={styles.vDivider} />
                <View style={styles.varianceCol}>
                  <Text style={[styles.varianceLabel, { color: '#fb7185' }]}>VARIANCE</Text>
                  <Text style={[styles.varianceVal, { color: '#fb7185' }]}>
                    -{d.shortageCount} PCS
                  </Text>
                </View>
              </View>

              {/* Vertical Connected Custody Timeline */}
              <View style={styles.timelineContainer}>
                <View style={styles.timelineItem}>
                  <View style={[styles.timelineDot, { backgroundColor: '#6366f1' }]} />
                  <View style={styles.timelineContent}>
                    <Text style={styles.timelineTag}>ORIGIN DISPATCH</Text>
                    <Text style={styles.timelinePrimary}>
                      {t.dispatchedBy?.fullName || 'Dispatch Officer'}
                    </Text>
                    <Text style={styles.timelineSecondary}>{t.sourceBranch?.branchName}</Text>
                  </View>
                </View>

                <View style={styles.timelineItem}>
                  <View style={[styles.timelineDot, { backgroundColor: '#f59e0b' }]} />
                  <View style={[styles.timelineContent, styles.driverTimelineRow]}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.timelineTag}>TRANSIT FLEET</Text>
                      <Text style={styles.timelinePrimary}>
                        {t.vehicle?.registrationNo} • {t.vehicle?.driverName}
                      </Text>
                      <Text style={styles.timelineSecondary}>
                        NIC: {t.vehicle?.driverNic}
                      </Text>
                    </View>
                    {t.vehicle?.driverPhone && (
                      <TouchableOpacity
                        style={styles.callDriverPill}
                        onPress={() => Linking.openURL(`tel:${t.vehicle.driverPhone}`)}
                      >
                        <Ionicons name="call" size={13} color="#060913" />
                        <Text style={styles.callDriverText}>Call</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </View>

                <View style={styles.timelineItem}>
                  <View style={[styles.timelineDot, { backgroundColor: '#f43f5e' }]} />
                  <View style={styles.timelineContent}>
                    <Text style={styles.timelineTag}>DESTINATION INTAKE</Text>
                    <Text style={styles.timelinePrimary}>
                      {d.reportedBy?.fullName || t.receivedBy?.fullName || 'Receiving Officer'}
                    </Text>
                    <Text style={styles.timelineSecondary}>
                      {t.destinationBranch?.branchName}
                    </Text>
                  </View>
                </View>
              </View>

              {d.comments ? (
                <View style={styles.auditLogBox}>
                  <Text style={styles.auditLogText}>{d.comments}</Text>
                </View>
              ) : null}

              <TextInput
                style={styles.noteInput}
                value={notesById[d.id] ?? ''}
                onChangeText={(txt) => setNotesById((prev) => ({ ...prev, [d.id]: txt }))}
                placeholder="Enter resolution or investigation notes..."
                placeholderTextColor="#475569"
              />

              <View style={styles.actionRow}>
                <TouchableOpacity
                  style={styles.investigateBtn}
                  disabled={updatingId === d.id}
                  onPress={() => handleStatusUpdate(d.id, 'INVESTIGATING')}
                >
                  <Text style={styles.investigateBtnText}>Investigating</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.resolveBtn}
                  disabled={updatingId === d.id}
                  onPress={() => handleStatusUpdate(d.id, 'RESOLVED')}
                >
                  <Ionicons name="checkmark-done" size={16} color="#ffffff" />
                  <Text style={styles.resolveBtnText}>Mark Resolved</Text>
                </TouchableOpacity>
              </View>
            </View>
          );
        })
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
  filterBar: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 14,
  },
  filterChip: {
    flex: 1,
    backgroundColor: '#0D1322',
    borderColor: '#1E293B',
    borderWidth: 1,
    paddingVertical: 9,
    borderRadius: 12,
    alignItems: 'center',
  },
  filterChipActive: {
    backgroundColor: '#4f46e5',
    borderColor: '#6366f1',
  },
  filterText: {
    color: '#94a3b8',
    fontSize: 11,
    fontWeight: '700',
  },
  filterTextActive: {
    color: '#ffffff',
    fontWeight: '800',
  },
  emptyCard: {
    backgroundColor: '#0D1322',
    borderColor: '#1E293B',
    borderWidth: 1,
    borderRadius: 22,
    padding: 36,
    alignItems: 'center',
  },
  emptyIconCircle: {
    width: 56,
    height: 56,
    borderRadius: 18,
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  emptyTitle: {
    color: '#ffffff',
    fontSize: 17,
    fontWeight: '800',
  },
  emptySub: {
    color: '#64748b',
    fontSize: 12,
    marginTop: 4,
    textAlign: 'center',
  },
  card: {
    backgroundColor: '#0D1322',
    borderColor: '#1E293B',
    borderWidth: 1,
    borderRadius: 22,
    padding: 18,
    marginBottom: 14,
  },
  cardActiveAlert: {
    borderColor: 'rgba(244, 63, 94, 0.4)',
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 14,
  },
  codeGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  alertIconBox: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  codeText: {
    color: '#ffffff',
    fontFamily: 'monospace',
    fontSize: 16,
    fontWeight: '900',
  },
  styleSub: {
    color: '#94a3b8',
    fontSize: 12,
    marginTop: 2,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
    borderWidth: 1,
  },
  badgeOpen: {
    backgroundColor: 'rgba(244, 63, 94, 0.15)',
    borderColor: 'rgba(244, 63, 94, 0.4)',
  },
  badgeResolved: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    borderColor: 'rgba(16, 185, 129, 0.4)',
  },
  statusBadgeText: {
    fontSize: 10,
    fontWeight: '800',
  },
  varianceCard: {
    flexDirection: 'row',
    backgroundColor: '#060913',
    borderColor: '#1E293B',
    borderWidth: 1,
    borderRadius: 16,
    padding: 14,
    alignItems: 'center',
    marginBottom: 14,
  },
  varianceCol: {
    flex: 1,
    alignItems: 'center',
  },
  vDivider: {
    width: 1,
    height: 28,
    backgroundColor: '#1E293B',
  },
  varianceLabel: {
    color: '#64748b',
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.6,
  },
  varianceVal: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '900',
    fontFamily: 'monospace',
    marginTop: 3,
  },
  timelineContainer: {
    backgroundColor: '#060913',
    borderRadius: 16,
    padding: 14,
    gap: 12,
    marginBottom: 12,
  },
  timelineItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  timelineDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginTop: 4,
  },
  timelineContent: {
    flex: 1,
  },
  driverTimelineRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  timelineTag: {
    color: '#64748b',
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.6,
  },
  timelinePrimary: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '700',
    marginTop: 1,
  },
  timelineSecondary: {
    color: '#94a3b8',
    fontSize: 11,
  },
  callDriverPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#fbbf24',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 9,
  },
  callDriverText: {
    color: '#060913',
    fontSize: 11,
    fontWeight: '800',
  },
  auditLogBox: {
    backgroundColor: 'rgba(244, 63, 94, 0.08)',
    borderLeftWidth: 3,
    borderLeftColor: '#f43f5e',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    marginBottom: 12,
  },
  auditLogText: {
    color: '#cbd5e1',
    fontSize: 12,
    lineHeight: 17,
  },
  noteInput: {
    backgroundColor: '#060913',
    borderColor: '#1E293B',
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 11,
    color: '#ffffff',
    fontSize: 13,
    marginBottom: 12,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 10,
  },
  investigateBtn: {
    flex: 1,
    backgroundColor: 'rgba(245, 158, 11, 0.16)',
    borderColor: 'rgba(245, 158, 11, 0.4)',
    borderWidth: 1,
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  investigateBtnText: {
    color: '#fcd34d',
    fontSize: 13,
    fontWeight: '800',
  },
  resolveBtn: {
    flex: 1,
    backgroundColor: '#059669',
    height: 48,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  resolveBtnText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '800',
  },
});
