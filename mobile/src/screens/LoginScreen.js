import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { getApiBaseUrl, setApiBaseUrl } from '../api/client';

const QUICK_ROLES = [
  { label: 'Admin', username: 'admin', icon: 'shield-checkmark-outline' },
  { label: 'Dispatch', username: 'dispatcher', icon: 'cube-outline' },
  { label: 'Gate Security', username: 'security', icon: 'scan-outline' },
  { label: 'Receiving', username: 'receiver', icon: 'checkbox-outline' },
  { label: 'Manager', username: 'manager', icon: 'analytics-outline' },
];

export default function LoginScreen({ onLogin, loading, error }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [focusedField, setFocusedField] = useState(null);
  const [serverUrl, setServerUrl] = useState('http://10.0.2.2:4000');
  const [showSettings, setShowSettings] = useState(false);

  useEffect(() => {
    getApiBaseUrl().then(setServerUrl);
  }, []);

  const handleSaveServerUrl = async () => {
    const saved = await setApiBaseUrl(serverUrl);
    setServerUrl(saved);
    setShowSettings(false);
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Top Bar */}
        <View style={styles.topRow}>
          <View style={styles.statusChip}>
            <View style={styles.liveDot} />
            <Text style={styles.statusChipText}>ENTERPRISE LOGISTICS OS</Text>
          </View>

          <TouchableOpacity
            style={[styles.settingsBtn, showSettings && styles.settingsBtnActive]}
            onPress={() => setShowSettings(!showSettings)}
          >
            <Ionicons
              name="options-outline"
              size={18}
              color={showSettings ? '#818cf8' : '#94a3b8'}
            />
          </TouchableOpacity>
        </View>

        {/* Hero Brand Header */}
        <View style={styles.heroSection}>
          <View style={styles.logoOuterRing}>
            <View style={styles.logoSquircle}>
              <Ionicons name="qr-code" size={28} color="#ffffff" />
            </View>
          </View>
          <Text style={styles.brandTitle}>Trendy GatePass</Text>
          <Text style={styles.brandSubtitle}>
            Inter-Branch Garment Transit & Custody Platform
          </Text>
        </View>

        {/* Server Endpoint Configuration Drawer */}
        {showSettings && (
          <View style={styles.settingsCard}>
            <View style={styles.settingsHeader}>
              <Ionicons name="server-outline" size={15} color="#818cf8" />
              <Text style={styles.settingsTitle}>API Gateway Endpoint</Text>
            </View>
            <TextInput
              style={styles.settingsInput}
              value={serverUrl}
              onChangeText={setServerUrl}
              placeholder="http://10.0.2.2:4000"
              placeholderTextColor="#64748b"
              autoCapitalize="none"
            />
            <View style={styles.presetRow}>
              <TouchableOpacity
                style={styles.presetPill}
                onPress={() => setServerUrl('standalone')}
              >
                <Text style={styles.presetText}>Standalone (No PC)</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.presetPill}
                onPress={() => setServerUrl('http://127.0.0.1:4000')}
              >
                <Text style={styles.presetText}>USB Phone (127.0.0.1)</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.presetPill}
                onPress={() => setServerUrl('http://192.168.178.27:4000')}
              >
                <Text style={styles.presetText}>Wi-Fi (192.168.178.27)</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.presetPill}
                onPress={() => setServerUrl('http://10.0.2.2:4000')}
              >
                <Text style={styles.presetText}>Emulator (10.0.2.2)</Text>
              </TouchableOpacity>
            </View>
            <TouchableOpacity style={styles.saveEndpointBtn} onPress={handleSaveServerUrl}>
              <Text style={styles.saveEndpointText}>Apply Endpoint</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Main Glassmorphic Sign-In Card */}
        <View style={styles.authCard}>
          <Text style={styles.cardHeading}>Operator Authentication</Text>
          <Text style={styles.cardDescription}>
            Sign in with your assigned plant credentials
          </Text>

          {error ? (
            <View style={styles.errorBanner}>
              <Ionicons name="alert-circle" size={18} color="#fb7185" />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

          {/* Username Field */}
          <Text style={styles.inputLabel}>OPERATOR ID OR EMAIL</Text>
          <View
            style={[
              styles.inputWrapper,
              focusedField === 'username' && styles.inputWrapperFocused,
            ]}
          >
            <Ionicons
              name="person-outline"
              size={18}
              color={focusedField === 'username' ? '#818cf8' : '#64748b'}
            />
            <TextInput
              style={styles.textInput}
              value={username}
              onChangeText={setUsername}
              onFocus={() => setFocusedField('username')}
              onBlur={() => setFocusedField(null)}
              autoCapitalize="none"
              placeholder="e.g. dispatcher, security, manager"
              placeholderTextColor="#475569"
            />
            {username.length > 0 && (
              <TouchableOpacity onPress={() => setUsername('')}>
                <Ionicons name="close-circle" size={17} color="#475569" />
              </TouchableOpacity>
            )}
          </View>

          {/* Password Field */}
          <Text style={styles.inputLabel}>SECURITY PASSKEY</Text>
          <View
            style={[
              styles.inputWrapper,
              focusedField === 'password' && styles.inputWrapperFocused,
            ]}
          >
            <Ionicons
              name="lock-closed-outline"
              size={18}
              color={focusedField === 'password' ? '#818cf8' : '#64748b'}
            />
            <TextInput
              style={styles.textInput}
              value={password}
              onChangeText={setPassword}
              onFocus={() => setFocusedField('password')}
              onBlur={() => setFocusedField(null)}
              secureTextEntry={!showPassword}
              placeholder="Enter password"
              placeholderTextColor="#475569"
            />
            <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
              <Ionicons
                name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                size={18}
                color="#64748b"
              />
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={[
              styles.signInBtn,
              (!username || !password) && styles.signInBtnDisabled,
            ]}
            disabled={loading || !username || !password}
            onPress={() => onLogin(username, password)}
          >
            {loading ? (
              <ActivityIndicator color="#ffffff" />
            ) : (
              <>
                <Text style={styles.signInBtnText}>Access Terminal</Text>
                <Ionicons name="arrow-forward" size={18} color="#ffffff" />
              </>
            )}
          </TouchableOpacity>
        </View>

        {/* Sleek Role Quick-Fill Bar */}
        <View style={styles.quickAccessSection}>
          <Text style={styles.quickAccessLabel}>QUICK TERMINAL PROFILE</Text>
          <View style={styles.quickPillGrid}>
            {QUICK_ROLES.map((item) => {
              const selected = username === item.username;
              return (
                <TouchableOpacity
                  key={item.username}
                  style={[styles.rolePill, selected && styles.rolePillActive]}
                  onPress={() => {
                    setUsername(item.username);
                    setPassword('password123');
                  }}
                >
                  <Ionicons
                    name={item.icon}
                    size={14}
                    color={selected ? '#ffffff' : '#94a3b8'}
                  />
                  <Text
                    style={[
                      styles.rolePillText,
                      selected && styles.rolePillTextActive,
                    ]}
                  >
                    {item.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#060913',
  },
  content: {
    paddingHorizontal: 22,
    paddingTop: 32,
    paddingBottom: 40,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 28,
  },
  statusChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#0D1322',
    borderColor: '#1E293B',
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  liveDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: '#10b981',
  },
  statusChipText: {
    color: '#94a3b8',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1,
  },
  settingsBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: '#0D1322',
    borderColor: '#1E293B',
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  settingsBtnActive: {
    borderColor: '#6366f1',
    backgroundColor: 'rgba(99, 102, 241, 0.12)',
  },
  heroSection: {
    alignItems: 'center',
    marginBottom: 28,
  },
  logoOuterRing: {
    padding: 6,
    borderRadius: 26,
    backgroundColor: 'rgba(99, 102, 241, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(99, 102, 241, 0.28)',
    marginBottom: 14,
  },
  logoSquircle: {
    width: 58,
    height: 58,
    borderRadius: 20,
    backgroundColor: '#4f46e5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandTitle: {
    color: '#ffffff',
    fontSize: 26,
    fontWeight: '900',
    letterSpacing: -0.4,
  },
  brandSubtitle: {
    color: '#64748b',
    fontSize: 13,
    fontWeight: '500',
    marginTop: 4,
    textAlign: 'center',
  },
  settingsCard: {
    backgroundColor: '#0D1322',
    borderColor: '#1E293B',
    borderWidth: 1,
    borderRadius: 20,
    padding: 16,
    marginBottom: 20,
  },
  settingsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 10,
  },
  settingsTitle: {
    color: '#e2e8f0',
    fontSize: 12,
    fontWeight: '800',
  },
  settingsInput: {
    backgroundColor: '#060913',
    borderColor: '#1E293B',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 11,
    color: '#38bdf8',
    fontFamily: 'monospace',
    fontSize: 13,
    marginBottom: 10,
  },
  presetRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 10,
  },
  presetPill: {
    backgroundColor: '#151E32',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  presetText: {
    color: '#94a3b8',
    fontSize: 11,
    fontWeight: '600',
  },
  saveEndpointBtn: {
    backgroundColor: '#4f46e5',
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
  },
  saveEndpointText: {
    color: '#ffffff',
    fontWeight: '800',
    fontSize: 12,
  },
  authCard: {
    backgroundColor: '#0D1322',
    borderColor: '#1E293B',
    borderWidth: 1,
    borderRadius: 24,
    padding: 22,
    marginBottom: 24,
  },
  cardHeading: {
    color: '#ffffff',
    fontSize: 19,
    fontWeight: '800',
  },
  cardDescription: {
    color: '#64748b',
    fontSize: 13,
    marginTop: 3,
    marginBottom: 18,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(244, 63, 94, 0.12)',
    borderColor: 'rgba(244, 63, 94, 0.35)',
    borderWidth: 1,
    padding: 12,
    borderRadius: 14,
    marginBottom: 16,
  },
  errorText: {
    color: '#fda4af',
    fontSize: 12,
    fontWeight: '600',
    flex: 1,
  },
  inputLabel: {
    color: '#94a3b8',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.8,
    marginBottom: 8,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#060913',
    borderColor: '#1E293B',
    borderWidth: 1.5,
    borderRadius: 14,
    paddingHorizontal: 14,
    height: 52,
    marginBottom: 16,
    gap: 10,
  },
  inputWrapperFocused: {
    borderColor: '#6366f1',
    backgroundColor: '#090D1A',
  },
  textInput: {
    flex: 1,
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
  signInBtn: {
    backgroundColor: '#4f46e5',
    height: 54,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 6,
  },
  signInBtnDisabled: {
    opacity: 0.5,
  },
  signInBtnText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '800',
  },
  quickAccessSection: {
    alignItems: 'center',
  },
  quickAccessLabel: {
    color: '#475569',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1,
    marginBottom: 10,
  },
  quickPillGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 8,
  },
  rolePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#0D1322',
    borderColor: '#1E293B',
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
  },
  rolePillActive: {
    backgroundColor: '#4f46e5',
    borderColor: '#6366f1',
  },
  rolePillText: {
    color: '#94a3b8',
    fontSize: 12,
    fontWeight: '700',
  },
  rolePillTextActive: {
    color: '#ffffff',
  },
});
