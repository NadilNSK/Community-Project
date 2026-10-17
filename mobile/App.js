import React, { useState, useEffect, useCallback } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import {
  apiRequest,
  getStoredSession,
  saveAuthSession,
  clearAuthSession,
  cacheConsignmentsLocally,
} from './src/api/client';

import LoginScreen from './src/screens/LoginScreen';
import DashboardScreen from './src/screens/DashboardScreen';
import DispatchScreen from './src/screens/DispatchScreen';
import ScannerScreen from './src/screens/ScannerScreen';
import DiscrepancyScreen from './src/screens/DiscrepancyScreen';
import AdminScreen from './src/screens/AdminScreen';
import QrPassModal from './src/components/QrPassModal';

const ALL_TABS = [
  {
    id: 'dashboard',
    label: 'Overview',
    icon: 'grid-outline',
    activeIcon: 'grid',
    roles: ['SYSTEM_ADMIN', 'LOGISTICS_MANAGER', 'DISPATCH_OFFICER', 'RECEIVING_OFFICER'],
  },
  {
    id: 'dispatch',
    label: 'Dispatch',
    icon: 'cube-outline',
    activeIcon: 'cube',
    roles: ['SYSTEM_ADMIN', 'DISPATCH_OFFICER'],
  },
  {
    id: 'scanner',
    label: 'Gate Scan',
    icon: 'qr-code-outline',
    activeIcon: 'qr-code',
    roles: ['SYSTEM_ADMIN', 'GATE_SECURITY', 'RECEIVING_OFFICER'],
  },
  {
    id: 'discrepancies',
    label: 'Exceptions',
    icon: 'shield-half-outline',
    activeIcon: 'shield-half',
    roles: ['SYSTEM_ADMIN', 'LOGISTICS_MANAGER', 'RECEIVING_OFFICER'],
  },
  {
    id: 'admin',
    label: 'System',
    icon: 'settings-outline',
    activeIcon: 'settings',
    roles: ['SYSTEM_ADMIN'],
  },
];

const ROLE_LABELS = {
  SYSTEM_ADMIN: 'System Admin',
  DISPATCH_OFFICER: 'Dispatch Officer',
  GATE_SECURITY: 'Gate Security',
  RECEIVING_OFFICER: 'Receiving Officer',
  LOGISTICS_MANAGER: 'Logistics Manager',
};

export default function App() {
  const [user, setUser] = useState(null);
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginError, setLoginError] = useState('');
  const [activeTab, setActiveTab] = useState('dashboard');

  // Shared Operational State
  const [overview, setOverview] = useState(null);
  const [transfers, setTransfers] = useState([]);
  const [branches, setBranches] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [discrepancies, setDiscrepancies] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedPass, setSelectedPass] = useState(null);

  const loadOperationalData = useCallback(async () => {
    setRefreshing(true);
    try {
      const [ovRes, trRes, brRes, vhRes, dsRes] = await Promise.all([
        apiRequest('/api/dashboard/overview').catch(() => null),
        apiRequest('/api/transfers').catch(() => []),
        apiRequest('/api/auth/branches').catch(() => []),
        apiRequest('/api/auth/vehicles').catch(() => []),
        apiRequest('/api/discrepancies').catch(() => []),
      ]);

      if (ovRes) setOverview(ovRes);
      if (Array.isArray(trRes)) {
        setTransfers(trRes);
        cacheConsignmentsLocally(trRes);
      }
      if (Array.isArray(brRes)) setBranches(brRes);
      if (Array.isArray(vhRes)) setVehicles(vhRes);
      if (Array.isArray(dsRes)) setDiscrepancies(dsRes);
    } finally {
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    getStoredSession().then(({ token, user: storedUser }) => {
      if (token && storedUser) {
        setUser(storedUser);
      }
    });
  }, []);

  const allowedTabs = user
    ? ALL_TABS.filter((t) => t.roles.includes(user.role))
    : [];

  useEffect(() => {
    if (user) {
      if (allowedTabs.length > 0 && !allowedTabs.some((t) => t.id === activeTab)) {
        setActiveTab(allowedTabs[0].id);
      }
      loadOperationalData();
    }
  }, [user, loadOperationalData]);

  const handleLogin = async (username, password) => {
    setLoginError('');
    setLoginLoading(true);
    try {
      const res = await apiRequest('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ username: username.trim(), password }),
      });
      await saveAuthSession(res.token, res.user);
      setUser(res.user);
    } catch (err) {
      setLoginError(err.message || 'Authentication failed.');
    } finally {
      setLoginLoading(false);
    }
  };

  const handleLogout = async () => {
    await clearAuthSession();
    setUser(null);
    setSelectedPass(null);
  };

  if (!user) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <StatusBar barStyle="light-content" backgroundColor="#060913" />
        <LoginScreen
          onLogin={handleLogin}
          loading={loginLoading}
          error={loginError}
        />
      </SafeAreaView>
    );
  }

  const initials = user.fullName
    ? user.fullName
        .split(' ')
        .map((w) => w[0])
        .join('')
        .slice(0, 2)
        .toUpperCase()
    : 'TR';

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor="#060913" />

      {/* Modern App Header */}
      <View style={styles.topBar}>
        <View style={styles.brandRow}>
          <View style={styles.avatarCircle}>
            <Text style={styles.avatarInitials}>{initials}</Text>
            <View style={styles.onlineDot} />
          </View>
          <View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 7 }}>
              <Text style={styles.userNameText}>{user.fullName}</Text>
              <View style={styles.roleBadge}>
                <Text style={styles.roleBadgeText}>
                  {ROLE_LABELS[user.role] || user.role}
                </Text>
              </View>
            </View>
            <View style={styles.plantRow}>
              <Ionicons name="location-outline" size={11} color="#64748B" />
              <Text style={styles.plantSub}>
                {user.branchName || 'SE Apparel Head Office'}
              </Text>
            </View>
          </View>
        </View>

        <TouchableOpacity
          style={styles.logoutBtn}
          onPress={handleLogout}
          activeOpacity={0.75}
        >
          <Ionicons name="log-out-outline" size={18} color="#94A3B8" />
        </TouchableOpacity>
      </View>

      {/* Active Screen Content */}
      <View style={styles.contentArea}>
        {activeTab === 'dashboard' && (
          <DashboardScreen
            overview={overview}
            transfers={transfers}
            refreshing={refreshing}
            onRefresh={loadOperationalData}
            onOpenPass={(pass) => setSelectedPass(pass)}
            onNavigateTab={(tabId) => setActiveTab(tabId)}
          />
        )}
        {activeTab === 'dispatch' && (
          <DispatchScreen
            user={user}
            branches={branches}
            vehicles={vehicles}
            transfers={transfers}
            onCreatedPass={(newPass) => {
              loadOperationalData();
              setSelectedPass(newPass);
            }}
            onOpenPass={(pass) => setSelectedPass(pass)}
          />
        )}
        {activeTab === 'scanner' && (
          <ScannerScreen
            user={user}
            transfers={transfers}
            onScanCompleted={loadOperationalData}
          />
        )}
        {activeTab === 'discrepancies' && (
          <DiscrepancyScreen
            discrepancies={discrepancies}
            onUpdated={loadOperationalData}
          />
        )}
        {activeTab === 'admin' && (
          <AdminScreen
            branches={branches}
            vehicles={vehicles}
            onUpdated={loadOperationalData}
          />
        )}
      </View>

      {/* Modern Floating-Style Bottom Navigation */}
      <View style={styles.bottomNavOuter}>
        <View style={styles.bottomNav}>
          {allowedTabs.map((tab) => {
            const active = activeTab === tab.id;
            return (
              <TouchableOpacity
                key={tab.id}
                style={[styles.navItem, active && styles.navItemActive]}
                onPress={() => setActiveTab(tab.id)}
                activeOpacity={0.8}
              >
                <View style={[styles.navIconPill, active && styles.navIconPillActive]}>
                  <Ionicons
                    name={active ? tab.activeIcon : tab.icon}
                    size={19}
                    color={active ? '#818CF8' : '#64748B'}
                  />
                </View>
                <Text style={[styles.navLabel, active && styles.navLabelActive]}>
                  {tab.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* Master QR Gate Pass Modal */}
      <QrPassModal
        visible={Boolean(selectedPass)}
        passData={selectedPass}
        onClose={() => setSelectedPass(null)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#060913',
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#060913',
    borderBottomWidth: 1,
    borderBottomColor: '#131C31',
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
  },
  avatarCircle: {
    width: 40,
    height: 40,
    borderRadius: 13,
    backgroundColor: '#131C31',
    borderWidth: 1,
    borderColor: '#6366F150',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  avatarInitials: {
    color: '#818CF8',
    fontSize: 14,
    fontWeight: '800',
  },
  onlineDot: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#10B981',
    borderWidth: 2,
    borderColor: '#060913',
  },
  userNameText: {
    color: '#F8FAFC',
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: -0.2,
  },
  roleBadge: {
    backgroundColor: '#6366F120',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#6366F140',
  },
  roleBadgeText: {
    color: '#818CF8',
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  plantRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    marginTop: 2,
  },
  plantSub: {
    color: '#64748B',
    fontSize: 11,
    fontWeight: '600',
  },
  logoutBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: '#0D1322',
    borderWidth: 1,
    borderColor: '#1E293B',
    alignItems: 'center',
    justifyContent: 'center',
  },
  contentArea: {
    flex: 1,
  },
  bottomNavOuter: {
    backgroundColor: '#060913',
    paddingHorizontal: 12,
    paddingBottom: 10,
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: '#131C31',
  },
  bottomNav: {
    flexDirection: 'row',
    backgroundColor: '#0D1322',
    borderRadius: 20,
    paddingVertical: 6,
    paddingHorizontal: 6,
    borderWidth: 1,
    borderColor: '#1E293B',
  },
  navItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 4,
    borderRadius: 14,
  },
  navItemActive: {
    backgroundColor: '#131C31',
  },
  navIconPill: {
    paddingHorizontal: 12,
    paddingVertical: 3,
    borderRadius: 10,
  },
  navIconPillActive: {
    backgroundColor: '#6366F120',
  },
  navLabel: {
    color: '#64748B',
    fontSize: 10,
    fontWeight: '700',
    marginTop: 2,
  },
  navLabelActive: {
    color: '#F8FAFC',
    fontWeight: '800',
  },
});
