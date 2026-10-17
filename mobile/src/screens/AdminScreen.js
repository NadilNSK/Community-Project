import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { apiRequest } from '../api/client';

const ROLE_COLORS = {
  SYSTEM_ADMIN: { bg: '#3B82F618', border: '#3B82F640', text: '#60A5FA', label: 'System Admin' },
  DISPATCH_OFFICER: { bg: '#8B5CF618', border: '#8B5CF640', text: '#A78BFA', label: 'Dispatch Officer' },
  GATE_SECURITY: { bg: '#F59E0B18', border: '#F59E0B40', text: '#FBBF24', label: 'Gate Security' },
  RECEIVING_OFFICER: { bg: '#10B98118', border: '#10B98140', text: '#34D399', label: 'Receiving Officer' },
  LOGISTICS_MANAGER: { bg: '#EC489918', border: '#EC489940', text: '#F472B6', label: 'Logistics Manager' },
};

const ROLES_LIST = [
  'DISPATCH_OFFICER',
  'GATE_SECURITY',
  'RECEIVING_OFFICER',
  'LOGISTICS_MANAGER',
  'SYSTEM_ADMIN',
];

export default function AdminScreen({ branches: initialBranches = [], vehicles: initialVehicles = [], onUpdated }) {
  const [section, setSection] = useState('USERS');
  const [users, setUsers] = useState([]);
  const [branches, setBranches] = useState(initialBranches);
  const [vehicles, setVehicles] = useState(initialVehicles);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [feedback, setFeedback] = useState({ type: '', text: '' });

  // User Form
  const [fullName, setFullName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('DISPATCH_OFFICER');
  const [assignedBranchId, setAssignedBranchId] = useState('');

  // Branch Form
  const [branchCode, setBranchCode] = useState('');
  const [branchName, setBranchName] = useState('');
  const [branchType, setBranchType] = useState('SEWING');
  const [locationAddress, setLocationAddress] = useState('');

  // Vehicle Form
  const [registrationNo, setRegistrationNo] = useState('');
  const [driverName, setDriverName] = useState('');
  const [driverNic, setDriverNic] = useState('');
  const [driverPhone, setDriverPhone] = useState('');
  const [vehicleType, setVehicleType] = useState('16ft Container Lorry');

  const loadData = async () => {
    try {
      setLoading(true);
      const [u, b, v] = await Promise.all([
        apiRequest('/api/auth/users'),
        apiRequest('/api/auth/branches'),
        apiRequest('/api/auth/vehicles'),
      ]);
      setUsers(Array.isArray(u) ? u : []);
      setBranches(Array.isArray(b) ? b : []);
      setVehicles(Array.isArray(v) ? v : []);
      if (Array.isArray(b) && b.length > 0 && !assignedBranchId) {
        setAssignedBranchId(b[0].id);
      }
    } catch (err) {
      setFeedback({ type: 'error', text: err.message });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCreateUser = async () => {
    setFeedback({ type: '', text: '' });
    if (!fullName || !username) {
      setFeedback({ type: 'error', text: 'Full name and username are required.' });
      return;
    }
    const cleanUser = username.toLowerCase().trim();
    const userEmail = email.trim() || `${cleanUser}@trendyapparel.lk`;
    const targetBranch = assignedBranchId || branches[0]?.id;

    try {
      setSubmitting(true);
      await apiRequest('/api/auth/users', {
        method: 'POST',
        body: JSON.stringify({
          fullName: fullName.trim(),
          username: cleanUser,
          email: userEmail,
          password: 'password123',
          role,
          assignedBranchId: targetBranch,
        }),
      });
      setFullName('');
      setUsername('');
      setEmail('');
      setShowForm(false);
      setFeedback({ type: 'success', text: `Operator '${cleanUser}' provisioned (default pass: password123).` });
      await loadData();
      if (onUpdated) onUpdated();
    } catch (err) {
      setFeedback({ type: 'error', text: err.message });
    } finally {
      setSubmitting(false);
    }
  };

  const handleCreateBranch = async () => {
    setFeedback({ type: '', text: '' });
    if (!branchCode || !branchName || !locationAddress) {
      setFeedback({ type: 'error', text: 'Code, facility name, and location are required.' });
      return;
    }
    try {
      setSubmitting(true);
      await apiRequest('/api/auth/branches', {
        method: 'POST',
        body: JSON.stringify({
          branchCode: branchCode.toUpperCase().trim(),
          branchName: branchName.trim(),
          branchType,
          locationAddress: locationAddress.trim(),
        }),
      });
      setBranchCode('');
      setBranchName('');
      setLocationAddress('');
      setShowForm(false);
      setFeedback({ type: 'success', text: `Facility '${branchCode.toUpperCase()}' registered.` });
      await loadData();
      if (onUpdated) onUpdated();
    } catch (err) {
      setFeedback({ type: 'error', text: err.message });
    } finally {
      setSubmitting(false);
    }
  };

  const handleCreateVehicle = async () => {
    setFeedback({ type: '', text: '' });
    if (!registrationNo || !driverName || !driverPhone) {
      setFeedback({ type: 'error', text: 'Plate number, driver name, and phone are required.' });
      return;
    }
    try {
      setSubmitting(true);
      await apiRequest('/api/auth/vehicles', {
        method: 'POST',
        body: JSON.stringify({
          registrationNo: registrationNo.toUpperCase().trim(),
          driverName: driverName.trim(),
          driverNic: driverNic.trim() || '199000000000',
          driverPhone: driverPhone.trim(),
          vehicleType: vehicleType.trim() || 'Container Lorry',
        }),
      });
      setRegistrationNo('');
      setDriverName('');
      setDriverNic('');
      setDriverPhone('');
      setShowForm(false);
      setFeedback({ type: 'success', text: `Vehicle '${registrationNo.toUpperCase()}' added to fleet.` });
      await loadData();
      if (onUpdated) onUpdated();
    } catch (err) {
      setFeedback({ type: 'error', text: err.message });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ paddingBottom: 36 }}
      showsVerticalScrollIndicator={false}
    >
      {/* Modern Header */}
      <View style={styles.headerRow}>
        <View>
          <Text style={styles.screenTitle}>System Administration</Text>
          <Text style={styles.screenSub}>Manage operators, plant facilities & fleet</Text>
        </View>
        <TouchableOpacity
          style={[styles.addBtn, showForm && styles.addBtnClose]}
          onPress={() => {
            setShowForm(!showForm);
            setFeedback({ type: '', text: '' });
          }}
        >
          <Ionicons name={showForm ? 'close' : 'add'} size={18} color="#FFFFFF" />
          <Text style={styles.addBtnText}>{showForm ? 'Close' : 'Add New'}</Text>
        </TouchableOpacity>
      </View>

      {/* Segmented Control */}
      <View style={styles.segmentWrap}>
        {[
          { id: 'USERS', label: 'Operators', count: users.length, icon: 'people-outline' },
          { id: 'PLANTS', label: 'Facilities', count: branches.length, icon: 'business-outline' },
          { id: 'VEHICLES', label: 'Fleet', count: vehicles.length, icon: 'bus-outline' },
        ].map((tab) => {
          const active = section === tab.id;
          return (
            <TouchableOpacity
              key={tab.id}
              onPress={() => {
                setSection(tab.id);
                setFeedback({ type: '', text: '' });
              }}
              style={[styles.segmentBtn, active && styles.segmentBtnActive]}
            >
              <Ionicons name={tab.icon} size={14} color={active ? '#FFFFFF' : '#64748B'} />
              <Text style={[styles.segmentText, active && styles.segmentTextActive]}>{tab.label}</Text>
              <View style={[styles.segmentCount, active && styles.segmentCountActive]}>
                <Text style={[styles.segmentCountText, active && { color: '#FFFFFF' }]}>{tab.count}</Text>
              </View>
            </TouchableOpacity>
          );
        })}
      </View>

      {feedback.text ? (
        <View style={[styles.alertBox, feedback.type === 'error' ? styles.alertError : styles.alertSuccess]}>
          <Ionicons
            name={feedback.type === 'error' ? 'alert-circle' : 'checkmark-circle'}
            size={18}
            color={feedback.type === 'error' ? '#F87171' : '#34D399'}
          />
          <Text style={styles.alertText}>{feedback.text}</Text>
        </View>
      ) : null}

      {loading ? (
        <ActivityIndicator color="#6366F1" size="large" style={{ marginTop: 40 }} />
      ) : (
        <>
          {/* USERS SECTION */}
          {section === 'USERS' && (
            <>
              {showForm && (
                <View style={styles.formCard}>
                  <View style={styles.formHeaderRow}>
                    <Ionicons name="person-add-outline" size={18} color="#818CF8" />
                    <Text style={styles.formTitle}>Provision Operator Account</Text>
                  </View>

                  <Text style={styles.label}>FULL NAME</Text>
                  <TextInput
                    style={styles.input}
                    value={fullName}
                    onChangeText={setFullName}
                    placeholder="e.g. Kasun Perera"
                    placeholderTextColor="#475569"
                  />

                  <View style={{ flexDirection: 'row', gap: 10 }}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.label}>USERNAME</Text>
                      <TextInput
                        style={styles.input}
                        value={username}
                        onChangeText={setUsername}
                        autoCapitalize="none"
                        placeholder="e.g. kasun.p"
                        placeholderTextColor="#475569"
                      />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.label}>EMAIL (OPTIONAL)</Text>
                      <TextInput
                        style={styles.input}
                        value={email}
                        onChangeText={setEmail}
                        autoCapitalize="none"
                        placeholder="kasun@trendyapparel.lk"
                        placeholderTextColor="#475569"
                      />
                    </View>
                  </View>

                  <Text style={styles.label}>ROLE ASSIGNMENT</Text>
                  <View style={styles.chipWrap}>
                    {ROLES_LIST.map((r) => {
                      const active = role === r;
                      const rc = ROLE_COLORS[r];
                      return (
                        <TouchableOpacity
                          key={r}
                          onPress={() => setRole(r)}
                          style={[styles.chip, active && styles.chipActive]}
                        >
                          <Text style={[styles.chipText, active && styles.chipTextActive]}>
                            {rc?.label || r}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>

                  <Text style={styles.label}>ASSIGNED FACILITY</Text>
                  <View style={styles.chipWrap}>
                    {branches.map((b) => {
                      const active = assignedBranchId === b.id;
                      return (
                        <TouchableOpacity
                          key={b.id}
                          onPress={() => setAssignedBranchId(b.id)}
                          style={[styles.chip, active && styles.chipActive]}
                        >
                          <Text style={[styles.chipText, active && styles.chipTextActive]}>
                            {b.branchName}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>

                  <TouchableOpacity style={styles.primaryBtn} onPress={handleCreateUser} disabled={submitting}>
                    <Text style={styles.primaryBtnText}>
                      {submitting ? 'Provisioning...' : 'Create Operator Account'}
                    </Text>
                  </TouchableOpacity>
                </View>
              )}

              {users.map((u) => {
                const rc = ROLE_COLORS[u.role] || ROLE_COLORS.SYSTEM_ADMIN;
                const initials = u.fullName
                  ? u.fullName
                      .split(' ')
                      .map((w) => w[0])
                      .join('')
                      .slice(0, 2)
                      .toUpperCase()
                  : 'OP';
                return (
                  <View key={u.id} style={styles.listCard}>
                    <View style={[styles.avatarBox, { backgroundColor: rc.bg, borderColor: rc.border }]}>
                      <Text style={[styles.avatarText, { color: rc.text }]}>{initials}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.listTitle}>{u.fullName}</Text>
                      <Text style={styles.listSub}>
                        @{u.username} • {u.assignedBranch?.branchName || 'Head Office'}
                      </Text>
                    </View>
                    <View style={[styles.roleBadge, { backgroundColor: rc.bg, borderColor: rc.border }]}>
                      <Text style={[styles.roleBadgeText, { color: rc.text }]}>{rc.label}</Text>
                    </View>
                  </View>
                );
              })}
            </>
          )}

          {/* PLANTS SECTION */}
          {section === 'PLANTS' && (
            <>
              {showForm && (
                <View style={styles.formCard}>
                  <View style={styles.formHeaderRow}>
                    <Ionicons name="business-outline" size={18} color="#818CF8" />
                    <Text style={styles.formTitle}>Register Production Facility</Text>
                  </View>

                  <View style={{ flexDirection: 'row', gap: 10 }}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.label}>PLANT CODE</Text>
                      <TextInput
                        style={styles.input}
                        value={branchCode}
                        onChangeText={setBranchCode}
                        placeholder="TR-WSH-05"
                        placeholderTextColor="#475569"
                        autoCapitalize="characters"
                      />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.label}>LOCATION</Text>
                      <TextInput
                        style={styles.input}
                        value={locationAddress}
                        onChangeText={setLocationAddress}
                        placeholder="Ratnapura Industrial Zone"
                        placeholderTextColor="#475569"
                      />
                    </View>
                  </View>

                  <Text style={styles.label}>FACILITY NAME</Text>
                  <TextInput
                    style={styles.input}
                    value={branchName}
                    onChangeText={setBranchName}
                    placeholder="Ratnapura Wet Processing Plant"
                    placeholderTextColor="#475569"
                  />

                  <Text style={styles.label}>FACILITY TYPE</Text>
                  <View style={styles.chipWrap}>
                    {['SEWING', 'WASHING', 'FINISHING', 'SUBCONTRACTOR', 'HEAD_OFFICE'].map((t) => {
                      const active = branchType === t;
                      return (
                        <TouchableOpacity
                          key={t}
                          onPress={() => setBranchType(t)}
                          style={[styles.chip, active && styles.chipActive]}
                        >
                          <Text style={[styles.chipText, active && styles.chipTextActive]}>{t}</Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>

                  <TouchableOpacity style={styles.primaryBtn} onPress={handleCreateBranch} disabled={submitting}>
                    <Text style={styles.primaryBtnText}>
                      {submitting ? 'Registering...' : 'Register Facility'}
                    </Text>
                  </TouchableOpacity>
                </View>
              )}

              {branches.map((b) => (
                <View key={b.id} style={styles.listCard}>
                  <View style={[styles.avatarBox, { backgroundColor: '#10B98118', borderColor: '#10B98140' }]}>
                    <Ionicons name="business-outline" size={18} color="#34D399" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.listTitle}>{b.branchName}</Text>
                    <Text style={styles.listSub}>
                      {b.branchCode} • {b.locationAddress}
                    </Text>
                  </View>
                  <View style={[styles.roleBadge, { backgroundColor: '#10B98118', borderColor: '#10B98140' }]}>
                    <Text style={[styles.roleBadgeText, { color: '#34D399' }]}>{b.branchType}</Text>
                  </View>
                </View>
              ))}
            </>
          )}

          {/* VEHICLES SECTION */}
          {section === 'VEHICLES' && (
            <>
              {showForm && (
                <View style={styles.formCard}>
                  <View style={styles.formHeaderRow}>
                    <Ionicons name="bus-outline" size={18} color="#818CF8" />
                    <Text style={styles.formTitle}>Register Transport Vehicle</Text>
                  </View>

                  <View style={{ flexDirection: 'row', gap: 10 }}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.label}>PLATE NUMBER</Text>
                      <TextInput
                        style={styles.input}
                        value={registrationNo}
                        onChangeText={setRegistrationNo}
                        placeholder="WP LN-9012"
                        placeholderTextColor="#475569"
                        autoCapitalize="characters"
                      />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.label}>VEHICLE TYPE</Text>
                      <TextInput
                        style={styles.input}
                        value={vehicleType}
                        onChangeText={setVehicleType}
                        placeholder="16ft Container Lorry"
                        placeholderTextColor="#475569"
                      />
                    </View>
                  </View>

                  <View style={{ flexDirection: 'row', gap: 10 }}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.label}>DRIVER NAME</Text>
                      <TextInput
                        style={styles.input}
                        value={driverName}
                        onChangeText={setDriverName}
                        placeholder="Sunil Shantha"
                        placeholderTextColor="#475569"
                      />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.label}>CONTACT PHONE</Text>
                      <TextInput
                        style={styles.input}
                        value={driverPhone}
                        onChangeText={setDriverPhone}
                        placeholder="0778899112"
                        placeholderTextColor="#475569"
                        keyboardType="phone-pad"
                      />
                    </View>
                  </View>

                  <Text style={styles.label}>DRIVER NIC NUMBER</Text>
                  <TextInput
                    style={styles.input}
                    value={driverNic}
                    onChangeText={setDriverNic}
                    placeholder="198812345678"
                    placeholderTextColor="#475569"
                  />

                  <TouchableOpacity style={styles.primaryBtn} onPress={handleCreateVehicle} disabled={submitting}>
                    <Text style={styles.primaryBtnText}>
                      {submitting ? 'Registering...' : 'Add Vehicle to Fleet'}
                    </Text>
                  </TouchableOpacity>
                </View>
              )}

              {vehicles.map((v) => (
                <View key={v.id} style={styles.listCard}>
                  <View style={[styles.avatarBox, { backgroundColor: '#F59E0B18', borderColor: '#F59E0B40' }]}>
                    <Ionicons name="bus-outline" size={18} color="#FBBF24" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.listTitle}>{v.registrationNo}</Text>
                    <Text style={styles.listSub}>
                      Driver: {v.driverName} • {v.driverPhone}
                    </Text>
                  </View>
                  <View style={[styles.roleBadge, { backgroundColor: '#F59E0B18', borderColor: '#F59E0B40' }]}>
                    <Text style={[styles.roleBadgeText, { color: '#FBBF24' }]}>{v.vehicleType}</Text>
                  </View>
                </View>
              ))}
            </>
          )}
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: 16, paddingTop: 14 },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  screenTitle: { color: '#F8FAFC', fontSize: 19, fontWeight: '800', letterSpacing: -0.3 },
  screenSub: { color: '#64748B', fontSize: 12, marginTop: 2 },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#4F46E5',
    paddingHorizontal: 13,
    paddingVertical: 9,
    borderRadius: 12,
  },
  addBtnClose: {
    backgroundColor: '#334155',
  },
  addBtnText: { color: '#FFFFFF', fontSize: 12, fontWeight: '800' },
  segmentWrap: {
    flexDirection: 'row',
    backgroundColor: '#0D1322',
    borderRadius: 16,
    padding: 5,
    borderWidth: 1,
    borderColor: '#1E293B',
    marginBottom: 14,
    gap: 4,
  },
  segmentBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    paddingVertical: 10,
    borderRadius: 12,
  },
  segmentBtnActive: {
    backgroundColor: '#1E293B',
  },
  segmentText: { color: '#64748B', fontWeight: '700', fontSize: 12 },
  segmentTextActive: { color: '#FFFFFF', fontWeight: '800' },
  segmentCount: {
    backgroundColor: '#131C31',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  segmentCountActive: {
    backgroundColor: '#4F46E5',
  },
  segmentCountText: { color: '#64748B', fontSize: 10, fontWeight: '800' },
  alertBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 13,
    borderRadius: 14,
    marginBottom: 12,
    borderWidth: 1,
  },
  alertError: { backgroundColor: '#EF444415', borderColor: '#EF444440' },
  alertSuccess: { backgroundColor: '#10B98115', borderColor: '#10B98140' },
  alertText: { color: '#F8FAFC', fontSize: 12, fontWeight: '600', flex: 1 },
  formCard: {
    backgroundColor: '#0D1322',
    borderRadius: 20,
    padding: 18,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#6366F140',
  },
  formHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  formTitle: { color: '#F8FAFC', fontSize: 15, fontWeight: '800' },
  label: {
    color: '#64748B',
    fontSize: 10,
    fontWeight: '800',
    marginTop: 10,
    marginBottom: 6,
    letterSpacing: 0.8,
  },
  input: {
    backgroundColor: '#060913',
    borderWidth: 1,
    borderColor: '#1E293B',
    borderRadius: 12,
    paddingHorizontal: 13,
    paddingVertical: 10,
    color: '#F8FAFC',
    fontSize: 13,
  },
  chipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 7 },
  chip: {
    paddingHorizontal: 11,
    paddingVertical: 7,
    borderRadius: 10,
    backgroundColor: '#060913',
    borderWidth: 1,
    borderColor: '#1E293B',
  },
  chipActive: { backgroundColor: '#4F46E5', borderColor: '#818CF8' },
  chipText: { color: '#94A3B8', fontSize: 11, fontWeight: '700' },
  chipTextActive: { color: '#FFFFFF', fontWeight: '800' },
  primaryBtn: {
    backgroundColor: '#4F46E5',
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 16,
  },
  primaryBtnText: { color: '#FFFFFF', fontWeight: '800', fontSize: 13 },
  listCard: {
    backgroundColor: '#0D1322',
    borderRadius: 16,
    padding: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#1E293B',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  avatarBox: {
    width: 42,
    height: 42,
    borderRadius: 13,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { fontSize: 14, fontWeight: '800' },
  listTitle: { color: '#F8FAFC', fontSize: 14, fontWeight: '700' },
  listSub: { color: '#64748B', fontSize: 11, marginTop: 2 },
  roleBadge: {
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 9,
    borderWidth: 1,
  },
  roleBadgeText: { fontSize: 9, fontWeight: '800', letterSpacing: 0.4 },
});
