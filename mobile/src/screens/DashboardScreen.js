import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const STATUS_META = {
  CREATED: {
    label: 'Awaiting Exit',
    bg: 'rgba(148, 163, 184, 0.14)',
    text: '#cbd5e1',
    border: 'rgba(148, 163, 184, 0.3)',
    dot: '#94a3b8',
    progress: 1,
  },
  IN_TRANSIT: {
    label: 'In Transit',
    bg: 'rgba(14, 165, 233, 0.15)',
    text: '#38bdf8',
    border: 'rgba(14, 165, 233, 0.35)',
    dot: '#0ea5e9',
    progress: 2,
  },
  RECEIVED: {
    label: 'Verified',
    bg: 'rgba(16, 185, 129, 0.15)',
    text: '#34d399',
    border: 'rgba(16, 185, 129, 0.35)',
    dot: '#10b981',
    progress: 3,
  },
  DISCREPANCY: {
    label: 'Shortage Alert',
    bg: 'rgba(244, 63, 94, 0.18)',
    text: '#fb7185',
    border: 'rgba(244, 63, 94, 0.45)',
    dot: '#f43f5e',
    progress: 3,
  },
  RESOLVED: {
    label: 'Resolved',
    bg: 'rgba(99, 102, 241, 0.15)',
    text: '#818cf8',
    border: 'rgba(99, 102, 241, 0.35)',
    dot: '#6366f1',
    progress: 3,
  },
};

const FILTER_TABS = [
  { id: 'ALL', label: 'All' },
  { id: 'IN_TRANSIT', label: 'In Transit' },
  { id: 'CREATED', label: 'Pending Exit' },
  { id: 'DISCREPANCY', label: 'Alerts' },
  { id: 'RECEIVED', label: 'Verified' },
];

export default function DashboardScreen({
  overview,
  transfers,
  refreshing,
  onRefresh,
  onOpenPass,
  onNavigateTab,
}) {
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  const kpis = overview?.kpis || {
    totalConsignments: 0,
    activeInTransitVehicles: 0,
    inTransitPieces: 0,
    totalDispatchedPieces: 0,
    openDiscrepanciesCount: 0,
    totalShortagePieces: 0,
    overdueCount: 0,
  };

  const filteredTransfers = transfers.filter((t) => {
    if (statusFilter !== 'ALL' && t.status !== statusFilter) return false;
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      t.transferCode?.toLowerCase().includes(q) ||
      t.garmentStyle?.toLowerCase().includes(q) ||
      t.vehicle?.registrationNo?.toLowerCase().includes(q) ||
      t.sourceBranch?.branchName?.toLowerCase().includes(q) ||
      t.destinationBranch?.branchName?.toLowerCase().includes(q)
    );
  });

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#6366f1" />
      }
    >
      {/* Hero Active Transit Card */}
      <View style={styles.heroCard}>
        <View style={styles.heroTopRow}>
          <View style={styles.livePill}>
            <View style={styles.liveDot} />
            <Text style={styles.livePillText}>LIVE FLEET TELEMETRY</Text>
          </View>
          <TouchableOpacity style={styles.newPassBtn} onPress={() => onNavigateTab('dispatch')}>
            <Ionicons name="add" size={16} color="#ffffff" />
            <Text style={styles.newPassBtnText}>New Pass</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.heroMetricValue}>
          {kpis.inTransitPieces.toLocaleString()}
          <Text style={styles.heroMetricUnit}> PCS</Text>
        </Text>
        <Text style={styles.heroMetricSub}>
          Currently moving across {kpis.activeInTransitVehicles} active inter-branch vehicle(s)
        </Text>

        {/* Mini Summary Bar inside Hero */}
        <View style={styles.heroFooter}>
          <View style={styles.heroStatItem}>
            <Text style={styles.heroStatLabel}>TOTAL VOLUME</Text>
            <Text style={styles.heroStatVal}>{kpis.totalDispatchedPieces.toLocaleString()} pcs</Text>
          </View>
          <View style={styles.heroDivider} />
          <View style={styles.heroStatItem}>
            <Text style={styles.heroStatLabel}>SHIPMENTS</Text>
            <Text style={styles.heroStatVal}>{kpis.totalConsignments} passes</Text>
          </View>
          <View style={styles.heroDivider} />
          <View style={styles.heroStatItem}>
            <Text style={styles.heroStatLabel}>OPEN ALERTS</Text>
            <Text
              style={[
                styles.heroStatVal,
                { color: kpis.openDiscrepanciesCount > 0 ? '#fb7185' : '#34d399' },
              ]}
            >
              {kpis.openDiscrepanciesCount} active
            </Text>
          </View>
        </View>
      </View>

      {/* Bento 2x2 KPI Grid */}
      <View style={styles.bentoGrid}>
        <View style={styles.bentoCard}>
          <View style={[styles.iconSquircle, { backgroundColor: 'rgba(14, 165, 233, 0.15)' }]}>
            <Ionicons name="bus" size={18} color="#38bdf8" />
          </View>
          <Text style={styles.bentoValue}>{kpis.activeInTransitVehicles}</Text>
          <Text style={styles.bentoLabel}>Active Lorries</Text>
        </View>

        <TouchableOpacity
          style={[
            styles.bentoCard,
            kpis.openDiscrepanciesCount > 0 && styles.bentoCardAlert,
          ]}
          onPress={() => onNavigateTab('discrepancies')}
        >
          <View style={[styles.iconSquircle, { backgroundColor: 'rgba(244, 63, 94, 0.16)' }]}>
            <Ionicons name="warning" size={18} color="#fb7185" />
          </View>
          <Text style={[styles.bentoValue, { color: '#fb7185' }]}>
            {kpis.totalShortagePieces}
          </Text>
          <Text style={styles.bentoLabel}>Missing Pieces →</Text>
        </TouchableOpacity>
      </View>

      {/* Overdue Transit SLA Alert Card */}
      {overview?.overdueShipments?.length > 0 && (
        <View style={styles.overdueCard}>
          <View style={styles.overdueHeader}>
            <View style={styles.overdueIconBox}>
              <Ionicons name="time" size={16} color="#fbbf24" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.overdueTitle}>SLA Delay Detected</Text>
              <Text style={styles.overdueSubtitle}>
                {overview.overdueShipments.length} shipment(s) exceeded expected transit time
              </Text>
            </View>
          </View>

          {overview.overdueShipments.map((item) => (
            <View key={item.id} style={styles.overdueRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.overdueCode}>
                  {item.transferCode} • {item.vehicleReg}
                </Text>
                <Text style={styles.overdueRoute}>
                  {item.sourceBranch} → {item.destinationBranch} ({item.elapsedMinutes}m)
                </Text>
              </View>
              <TouchableOpacity
                style={styles.callChip}
                onPress={() => Linking.openURL(`tel:${item.driverPhone}`)}
              >
                <Ionicons name="call" size={13} color="#060913" />
                <Text style={styles.callChipText}>Driver</Text>
              </TouchableOpacity>
            </View>
          ))}
        </View>
      )}

      {/* Search & Status Filter Bar */}
      <View style={styles.searchBox}>
        <Ionicons name="search-outline" size={18} color="#64748b" />
        <TextInput
          style={styles.searchInput}
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder="Search gate pass, style, vehicle, or plant..."
          placeholderTextColor="#475569"
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery('')}>
            <Ionicons name="close-circle" size={17} color="#64748b" />
          </TouchableOpacity>
        )}
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.filterScroll}
        contentContainerStyle={styles.filterRow}
      >
        {FILTER_TABS.map((tab) => {
          const active = statusFilter === tab.id;
          return (
            <TouchableOpacity
              key={tab.id}
              style={[styles.filterPill, active && styles.filterPillActive]}
              onPress={() => setStatusFilter(tab.id)}
            >
              <Text style={[styles.filterPillText, active && styles.filterPillTextActive]}>
                {tab.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Modern Consignment Cards */}
      {filteredTransfers.map((t) => {
        const meta = STATUS_META[t.status] || STATUS_META.CREATED;
        return (
          <View key={t.id} style={styles.shipmentCard}>
            {/* Card Top Header */}
            <View style={styles.cardTopRow}>
              <View style={styles.codeWrap}>
                <View style={[styles.statusDot, { backgroundColor: meta.dot }]} />
                <Text style={styles.shipCode}>{t.transferCode}</Text>
              </View>

              <View
                style={[
                  styles.statusBadge,
                  { backgroundColor: meta.bg, borderColor: meta.border },
                ]}
              >
                <Text style={[styles.statusBadgeText, { color: meta.text }]}>
                  {meta.label}
                </Text>
              </View>
            </View>

            {/* Garment Style & Quantity */}
            <View style={styles.styleRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.shipStyle}>{t.garmentStyle}</Text>
                <Text style={styles.shipColor}>{t.garmentColor}</Text>
              </View>
              <View style={styles.qtyBox}>
                <Text style={styles.qtyBig}>{t.dispatchedQty.toLocaleString()}</Text>
                <Text style={styles.qtyUnit}>PCS</Text>
              </View>
            </View>

            {/* Visual 3-Step Transit Progress Bar */}
            <View style={styles.progressTrack}>
              {[1, 2, 3].map((step) => (
                <View
                  key={step}
                  style={[
                    styles.progressSegment,
                    step <= meta.progress && {
                      backgroundColor:
                        t.status === 'DISCREPANCY' ? '#f43f5e' : meta.dot,
                    },
                  ]}
                />
              ))}
            </View>

            {/* Connected Route Timeline Box */}
            <View style={styles.routeTimeline}>
              <View style={styles.routeStop}>
                <Ionicons name="radio-button-on" size={13} color="#818cf8" />
                <Text style={styles.routePlant} numberOfLines={1}>
                  {t.sourceBranch?.branchName}
                </Text>
              </View>
              <Ionicons name="arrow-forward" size={13} color="#475569" />
              <View style={styles.routeStop}>
                <Ionicons name="location" size={13} color="#10b981" />
                <Text style={styles.routePlant} numberOfLines={1}>
                  {t.destinationBranch?.branchName}
                </Text>
              </View>
            </View>

            {/* Card Footer: Vehicle + QR Pass Action */}
            <View style={styles.cardFooter}>
              <View style={styles.vehiclePill}>
                <Ionicons name="bus-outline" size={14} color="#94a3b8" />
                <Text style={styles.vehicleText}>
                  {t.vehicle?.registrationNo} • {t.vehicle?.driverName}
                </Text>
              </View>

              <TouchableOpacity style={styles.qrActionBtn} onPress={() => onOpenPass(t.id)}>
                <Ionicons name="qr-code-outline" size={15} color="#ffffff" />
                <Text style={styles.qrActionText}>QR Pass</Text>
              </TouchableOpacity>
            </View>
          </View>
        );
      })}
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
    paddingBottom: 36,
  },
  heroCard: {
    backgroundColor: '#0D1322',
    borderColor: 'rgba(99, 102, 241, 0.3)',
    borderWidth: 1,
    borderRadius: 24,
    padding: 20,
    marginBottom: 14,
  },
  heroTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  livePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#10b981',
  },
  livePillText: {
    color: '#34d399',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  newPassBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#4f46e5',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 12,
  },
  newPassBtnText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '800',
  },
  heroMetricValue: {
    color: '#ffffff',
    fontSize: 36,
    fontWeight: '900',
    letterSpacing: -1,
  },
  heroMetricUnit: {
    color: '#818cf8',
    fontSize: 16,
    fontWeight: '800',
  },
  heroMetricSub: {
    color: '#94a3b8',
    fontSize: 12,
    marginTop: 2,
    marginBottom: 16,
  },
  heroFooter: {
    flexDirection: 'row',
    backgroundColor: '#060913',
    borderRadius: 16,
    padding: 12,
    alignItems: 'center',
  },
  heroStatItem: {
    flex: 1,
    alignItems: 'center',
  },
  heroStatLabel: {
    color: '#64748b',
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  heroStatVal: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '800',
    marginTop: 2,
  },
  heroDivider: {
    width: 1,
    height: 24,
    backgroundColor: '#1E293B',
  },
  bentoGrid: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 14,
  },
  bentoCard: {
    flex: 1,
    backgroundColor: '#0D1322',
    borderColor: '#1E293B',
    borderWidth: 1,
    borderRadius: 20,
    padding: 16,
  },
  bentoCardAlert: {
    borderColor: 'rgba(244, 63, 94, 0.4)',
  },
  iconSquircle: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  bentoValue: {
    color: '#ffffff',
    fontSize: 24,
    fontWeight: '900',
  },
  bentoLabel: {
    color: '#64748b',
    fontSize: 12,
    fontWeight: '600',
    marginTop: 2,
  },
  overdueCard: {
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
    borderColor: 'rgba(245, 158, 11, 0.35)',
    borderWidth: 1,
    borderRadius: 20,
    padding: 16,
    marginBottom: 14,
  },
  overdueHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 10,
  },
  overdueIconBox: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: 'rgba(245, 158, 11, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  overdueTitle: {
    color: '#fcd34d',
    fontSize: 13,
    fontWeight: '800',
  },
  overdueSubtitle: {
    color: '#fde68a',
    fontSize: 11,
  },
  overdueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(6, 9, 19, 0.55)',
    padding: 10,
    borderRadius: 12,
    marginTop: 6,
  },
  overdueCode: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '800',
  },
  overdueRoute: {
    color: '#cbd5e1',
    fontSize: 11,
    marginTop: 1,
  },
  callChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#fbbf24',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
  },
  callChipText: {
    color: '#060913',
    fontSize: 11,
    fontWeight: '800',
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0D1322',
    borderColor: '#1E293B',
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 14,
    height: 46,
    gap: 8,
    marginBottom: 12,
  },
  searchInput: {
    flex: 1,
    color: '#ffffff',
    fontSize: 13,
  },
  filterScroll: {
    marginBottom: 14,
  },
  filterRow: {
    gap: 8,
  },
  filterPill: {
    backgroundColor: '#0D1322',
    borderColor: '#1E293B',
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
  },
  filterPillActive: {
    backgroundColor: '#4f46e5',
    borderColor: '#6366f1',
  },
  filterPillText: {
    color: '#94a3b8',
    fontSize: 12,
    fontWeight: '700',
  },
  filterPillTextActive: {
    color: '#ffffff',
  },
  shipmentCard: {
    backgroundColor: '#0D1322',
    borderColor: '#1E293B',
    borderWidth: 1,
    borderRadius: 20,
    padding: 16,
    marginBottom: 12,
  },
  cardTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  codeWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  shipCode: {
    color: '#e2e8f0',
    fontFamily: 'monospace',
    fontSize: 14,
    fontWeight: '900',
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
    borderWidth: 1,
  },
  statusBadgeText: {
    fontSize: 10,
    fontWeight: '800',
  },
  styleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  shipStyle: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '800',
  },
  shipColor: {
    color: '#64748b',
    fontSize: 12,
    marginTop: 1,
  },
  qtyBox: {
    alignItems: 'flex-end',
  },
  qtyBig: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '900',
    fontFamily: 'monospace',
  },
  qtyUnit: {
    color: '#64748b',
    fontSize: 9,
    fontWeight: '800',
  },
  progressTrack: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 12,
  },
  progressSegment: {
    flex: 1,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#1E293B',
  },
  routeTimeline: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#060913',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 9,
    gap: 8,
    marginBottom: 12,
  },
  routeStop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
  },
  routePlant: {
    color: '#cbd5e1',
    fontSize: 11,
    fontWeight: '700',
    flexShrink: 1,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  vehiclePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  vehicleText: {
    color: '#94a3b8',
    fontSize: 11,
    fontWeight: '600',
  },
  qrActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#4f46e5',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
  },
  qrActionText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '800',
  },
});
