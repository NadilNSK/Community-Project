import React, { useState, useEffect, useCallback } from 'react';
import {
  LayoutDashboard,
  QrCode,
  ScanLine,
  AlertTriangle,
  Shield,
  LogOut,
} from 'lucide-react';
import {
  apiRequest,
  getStoredUser,
  getStoredToken,
  setAuthSession,
  clearAuthSession,
  cacheConsignmentsLocally,
} from './api/client';
import DashboardModule from './components/DashboardModule';
import DispatchModule from './components/DispatchModule';
import ScannerModule from './components/ScannerModule';
import DiscrepancyModule from './components/DiscrepancyModule';
import AdminModule from './components/AdminModule';

function getDefaultTabForRole(role) {
  if (role === 'GATE_SECURITY' || role === 'RECEIVING_OFFICER') return 'scanner';
  if (role === 'DISPATCH_OFFICER') return 'dispatch';
  return 'dashboard';
}

export default function App() {
  const [user, setUser] = useState(getStoredUser());
  const [activeTab, setActiveTab] = useState(
    user ? getDefaultTabForRole(user.role) : 'dashboard'
  );
  const [usernameInput, setUsernameInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [loginError, setLoginError] = useState('');
  const [loggingIn, setLoggingIn] = useState(false);

  const [overview, setOverview] = useState(null);
  const [transfers, setTransfers] = useState([]);
  const [discrepancies, setDiscrepancies] = useState([]);
  const [branches, setBranches] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [activePass, setActivePass] = useState(null);

  const loadAllData = useCallback(async () => {
    if (!getStoredToken()) return;
    try {
      const [ov, tr, disc, br, vh] = await Promise.all([
        apiRequest('/api/dashboard/overview'),
        apiRequest('/api/transfers'),
        apiRequest('/api/discrepancies'),
        apiRequest('/api/auth/branches'),
        apiRequest('/api/auth/vehicles'),
      ]);
      setOverview(ov);
      setTransfers(tr);
      cacheConsignmentsLocally(tr);
      setDiscrepancies(disc);
      setBranches(br);
      setVehicles(vh);
    } catch (err) {
      console.error('Data load error:', err);
    }
  }, []);

  useEffect(() => {
    if (user) {
      loadAllData();
    }
  }, [user, loadAllData]);

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setLoginError('');
    setLoggingIn(true);
    try {
      const data = await apiRequest('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ username: usernameInput, password: passwordInput }),
      });
      setAuthSession(data.token, data.user);
      setUser(data.user);
      setActiveTab(getDefaultTabForRole(data.user.role));
    } catch (err) {
      setLoginError(err.message);
    } finally {
      setLoggingIn(false);
    }
  };

  const handleLogout = () => {
    clearAuthSession();
    setUser(null);
    setActivePass(null);
  };

  const handleOpenPass = async (transferId) => {
    try {
      const passData = await apiRequest(`/api/transfers/${transferId}/pass`);
      setActivePass(passData);
      setActiveTab('dispatch');
    } catch (err) {
      alert(err.message);
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-4">
        <form
          onSubmit={handleLoginSubmit}
          className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-8 shadow-2xl space-y-6"
        >
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-indigo-600 flex items-center justify-center font-black text-white">
              <QrCode className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-lg font-extrabold text-white tracking-tight">
                TRENDY APPAREL
              </h1>
              <p className="text-xs text-slate-400 font-medium">
                Inter-Branch Garment Tracking & Gate Pass Portal
              </p>
            </div>
          </div>

          {loginError && (
            <div className="p-3.5 rounded-xl bg-rose-500/20 border border-rose-500/40 text-rose-200 text-xs font-semibold">
              {loginError}
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
              Username or Email
            </label>
            <input
              type="text"
              required
              value={usernameInput}
              onChange={(e) => setUsernameInput(e.target.value)}
              placeholder="Enter operator username"
              className="w-full px-4 py-3 rounded-xl bg-slate-950 border border-slate-800 text-white text-sm focus:border-indigo-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
              Password
            </label>
            <input
              type="password"
              required
              value={passwordInput}
              onChange={(e) => setPasswordInput(e.target.value)}
              placeholder="Enter password"
              className="w-full px-4 py-3 rounded-xl bg-slate-950 border border-slate-800 text-white text-sm focus:border-indigo-500 focus:outline-none"
            />
          </div>

          <button
            type="submit"
            disabled={loggingIn}
            className="w-full py-3.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-sm transition cursor-pointer"
          >
            {loggingIn ? 'Signing In...' : 'Sign In'}
          </button>
        </form>
      </div>
    );
  }

  const openDiscrepancyCount = discrepancies.filter((d) => !d.isResolved).length;

  const allNavItems = [
    {
      id: 'dashboard',
      label: 'Live Overview',
      icon: LayoutDashboard,
      roles: ['SYSTEM_ADMIN', 'LOGISTICS_MANAGER', 'DISPATCH_OFFICER'],
    },
    {
      id: 'dispatch',
      label: 'Dispatch & Gate Pass',
      icon: QrCode,
      roles: ['SYSTEM_ADMIN', 'DISPATCH_OFFICER', 'LOGISTICS_MANAGER'],
    },
    {
      id: 'scanner',
      label: 'Gate Scanner',
      icon: ScanLine,
      roles: ['SYSTEM_ADMIN', 'GATE_SECURITY', 'RECEIVING_OFFICER', 'LOGISTICS_MANAGER'],
    },
    {
      id: 'discrepancies',
      label: 'Discrepancies',
      icon: AlertTriangle,
      badge: openDiscrepancyCount > 0 ? openDiscrepancyCount : null,
      roles: ['SYSTEM_ADMIN', 'LOGISTICS_MANAGER', 'RECEIVING_OFFICER'],
    },
    {
      id: 'admin',
      label: 'Administration',
      icon: Shield,
      roles: ['SYSTEM_ADMIN'],
    },
  ];

  const navItems = allNavItems.filter((item) => item.roles.includes(user.role));

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      <header className="bg-slate-900/95 border-b border-slate-800 sticky top-0 z-30 backdrop-blur no-print">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-indigo-600 flex items-center justify-center font-black text-white">
              <QrCode className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-sm sm:text-base font-extrabold text-white">
                {user.branchName || 'Trendy Logistics'}
              </h1>
              <p className="text-xs text-slate-400">
                {user.fullName} • <span className="text-indigo-400 font-semibold">{user.role}</span>
              </p>
            </div>
          </div>

          <button
            onClick={handleLogout}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-rose-600/20 hover:text-rose-300 text-slate-300 text-xs font-semibold transition cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            Sign Out
          </button>
        </div>

        {navItems.length > 1 && (
          <div className="max-w-7xl mx-auto px-4 flex overflow-x-auto gap-1.5 pb-2.5">
            {navItems.map((item) => {
              const Icon = item.icon;
              const active = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition cursor-pointer ${
                    active
                      ? 'bg-indigo-600 text-white'
                      : 'bg-slate-950/60 hover:bg-slate-800 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{item.label}</span>
                  {item.badge && (
                    <span className="px-1.5 py-0.2 rounded-full bg-rose-500 text-white text-[10px] font-black">
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </header>

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 py-6">
        {activeTab === 'dashboard' && (
          <DashboardModule
            overview={overview}
            transfers={transfers}
            onRefresh={loadAllData}
            onOpenPass={handleOpenPass}
            onNavigateTab={setActiveTab}
          />
        )}

        {activeTab === 'dispatch' && (
          <DispatchModule
            user={user}
            branches={branches}
            vehicles={vehicles}
            transfers={transfers}
            activePass={activePass}
            setActivePass={setActivePass}
            onTransferCreated={loadAllData}
            onOpenPass={handleOpenPass}
          />
        )}

        {activeTab === 'scanner' && (
          <ScannerModule transfers={transfers} onScanCompleted={loadAllData} />
        )}

        {activeTab === 'discrepancies' && (
          <DiscrepancyModule discrepancies={discrepancies} onUpdated={loadAllData} />
        )}

        {activeTab === 'admin' && (
          <AdminModule
            branches={branches}
            vehicles={vehicles}
            onMasterDataUpdated={loadAllData}
          />
        )}
      </main>
    </div>
  );
}
