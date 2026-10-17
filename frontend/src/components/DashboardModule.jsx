import React from 'react';
import {
  Truck,
  Package,
  AlertTriangle,
  Clock,
  CheckCircle2,
  Download,
  QrCode,
  ArrowRight,
  RefreshCw,
  ShieldAlert,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  Cell,
  PieChart,
  Pie,
} from 'recharts';

const STATUS_BADGE = {
  CREATED: 'bg-slate-800 text-slate-200 border-slate-700',
  IN_TRANSIT: 'bg-sky-500/15 text-sky-300 border-sky-500/30',
  RECEIVED: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
  DISCREPANCY: 'bg-rose-500/20 text-rose-300 border-rose-500/40 animate-pulse',
  RESOLVED: 'bg-indigo-500/15 text-indigo-300 border-indigo-500/30',
};

const PIE_COLORS = ['#64748b', '#0ea5e9', '#10b981', '#f43f5e', '#6366f1'];

export default function DashboardModule({ overview, transfers, onRefresh, onOpenPass, onNavigateTab }) {
  const kpis = overview?.kpis || {
    totalConsignments: 0,
    activeInTransitVehicles: 0,
    inTransitPieces: 0,
    totalDispatchedPieces: 0,
    openDiscrepanciesCount: 0,
    totalShortagePieces: 0,
    overdueCount: 0,
  };

  const exportCsvReport = () => {
    const headers = [
      'Gate Pass Code',
      'Status',
      'Garment Style',
      'Color',
      'Source Branch',
      'Destination Branch',
      'Vehicle Reg',
      'Driver Name',
      'Dispatched Qty',
      'Received Qty',
      'Shortage',
      'Dispatch Time',
      'Received Time',
    ];
    const rows = transfers.map((t) => [
      t.transferCode,
      t.status,
      `"${t.garmentStyle}"`,
      `"${t.garmentColor}"`,
      `"${t.sourceBranch?.branchName || ''}"`,
      `"${t.destinationBranch?.branchName || ''}"`,
      t.vehicle?.registrationNo || '',
      `"${t.vehicle?.driverName || ''}"`,
      t.dispatchedQty,
      t.receivedQty ?? 'Pending',
      t.discrepancy ? t.discrepancy.shortageCount : 0,
      t.dispatchTimestamp ? new Date(t.dispatchTimestamp).toLocaleString() : 'Not Departed',
      t.receivedTimestamp ? new Date(t.receivedTimestamp).toLocaleString() : 'Pending',
    ]);

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Trendy_InterBranch_Logistics_Report_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-slate-900/90 border border-slate-800 rounded-2xl p-5">
        <div>
          <h2 className="text-xl font-bold text-white">
            Inter-Branch Logistics Overview
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Live transit monitoring across Sewing, Washing, Finishing & Subcontractor facilities
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={onRefresh}
            className="inline-flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-sm font-medium transition cursor-pointer"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh Live Data
          </button>
          <button
            onClick={exportCsvReport}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold shadow-lg shadow-indigo-600/25 transition cursor-pointer"
          >
            <Download className="w-4 h-4" />
            Export Excel/CSV Report
          </button>
        </div>
      </div>

      {/* Overdue Transit Alert Banner (FR6) */}
      {overview?.overdueShipments?.length > 0 && (
        <div className="bg-amber-500/10 border border-amber-500/40 rounded-2xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className="p-2.5 rounded-xl bg-amber-500/20 text-amber-400 shrink-0 mt-0.5">
              <Clock className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-amber-300 uppercase tracking-wide">
                Automated Transit Delay Alert (FR6) — {overview.overdueShipments.length} Vehicle(s) Overdue
              </h3>
              {overview.overdueShipments.map((item) => (
                <p key={item.id} className="text-sm text-amber-100/90 mt-1">
                  <span className="font-semibold text-white">{item.transferCode}</span> ({item.dispatchedQty} pcs{' '}
                  {item.garmentStyle}) on <span className="font-semibold">{item.vehicleReg}</span> (Driver:{' '}
                  {item.driverName} • {item.driverPhone}) from{' '}
                  <span className="underline">{item.sourceBranch}</span> to{' '}
                  <span className="underline">{item.destinationBranch}</span> — Elapsed:{' '}
                  <span className="font-bold text-amber-300">{item.elapsedMinutes} mins</span> (Expected:{' '}
                  {item.expectedTransitMinutes} mins)
                </p>
              ))}
            </div>
          </div>
          <button
            onClick={() => onNavigateTab('scanner')}
            className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs uppercase tracking-wider shrink-0 cursor-pointer"
          >
            Open Gate Scanner
          </button>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              In-Transit Vehicles
            </span>
            <div className="p-2.5 rounded-xl bg-sky-500/15 text-sky-400">
              <Truck className="w-5 h-5" />
            </div>
          </div>
          <div className="text-3xl font-extrabold text-white mt-3">
            {kpis.activeInTransitVehicles}
          </div>
          <p className="text-xs text-sky-400 mt-1 font-medium">
            {kpis.inTransitPieces.toLocaleString()} garment pieces currently on road
          </p>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Total Pieces Dispatched
            </span>
            <div className="p-2.5 rounded-xl bg-indigo-500/15 text-indigo-400">
              <Package className="w-5 h-5" />
            </div>
          </div>
          <div className="text-3xl font-extrabold text-white mt-3">
            {kpis.totalDispatchedPieces.toLocaleString()}
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Across {kpis.totalConsignments} Master QR Gate Passes
          </p>
        </div>

        <div
          onClick={() => onNavigateTab('discrepancies')}
          className="bg-slate-900 border border-rose-500/30 hover:border-rose-500/60 rounded-2xl p-5 cursor-pointer transition"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-rose-300">
              Active Discrepancy Alerts
            </span>
            <div className="p-2.5 rounded-xl bg-rose-500/20 text-rose-400">
              <AlertTriangle className="w-5 h-5" />
            </div>
          </div>
          <div className="text-3xl font-extrabold text-rose-400 mt-3">
            {kpis.openDiscrepanciesCount}
          </div>
          <p className="text-xs text-rose-300/90 mt-1 font-medium">
            {kpis.totalShortagePieces} missing pieces flagged for investigation →
          </p>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Overdue Shipments
            </span>
            <div className="p-2.5 rounded-xl bg-amber-500/15 text-amber-400">
              <ShieldAlert className="w-5 h-5" />
            </div>
          </div>
          <div className="text-3xl font-extrabold text-white mt-3">
            {kpis.overdueCount}
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Exceeding expected plant-to-plant transit SLA
          </p>
        </div>
      </div>

      {/* Analytics Charts (FR7) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-2xl p-5">
          <h3 className="text-base font-bold text-white">
            Inter-Branch Garment Transfer Volume (Dispatched vs Received Pieces)
          </h3>
          <p className="text-xs text-slate-400 mb-4">
            Real-time comparison across Sewing, Washing, Finishing & Subcontractor plants
          </p>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={overview?.branchChartData || []}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="branch" stroke="#94a3b8" tick={{ fontSize: 11 }} />
                <YAxis stroke="#94a3b8" tick={{ fontSize: 11 }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0f172a',
                    borderColor: '#334155',
                    borderRadius: '12px',
                    color: '#f8fafc',
                  }}
                />
                <Legend />
                <Bar dataKey="dispatchedPcs" name="Dispatched Pieces" fill="#6366f1" radius={[6, 6, 0, 0]} />
                <Bar dataKey="receivedPcs" name="Verified Received Pieces" fill="#10b981" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
          <h3 className="text-base font-bold text-white">Consignment Lifecycle Status</h3>
          <p className="text-xs text-slate-400 mb-4">Distribution of active & completed gate passes</p>
          <div className="h-52 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={(overview?.statusBreakdown || []).filter((s) => s.value > 0)}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={45}
                  outerRadius={75}
                  paddingAngle={4}
                >
                  {(overview?.statusBreakdown || [])
                    .filter((s) => s.value > 0)
                    .map((entry, idx) => (
                      <Cell key={entry.name} fill={PIE_COLORS[idx % PIE_COLORS.length]} />
                    ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0f172a',
                    borderColor: '#334155',
                    borderRadius: '12px',
                    color: '#f8fafc',
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="space-y-1.5 mt-2">
            {(overview?.statusBreakdown || []).map((item, idx) => (
              <div key={item.name} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <span
                    className="w-2.5 h-2.5 rounded-full"
                    style={{ backgroundColor: PIE_COLORS[idx % PIE_COLORS.length] }}
                  />
                  <span className="text-slate-300">{item.name}</span>
                </div>
                <span className="font-bold text-white">{item.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Live Inter-Branch Shipments Table (FR7) */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
        <div className="p-5 border-b border-slate-800 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div>
            <h3 className="text-base font-bold text-white">
              Live Inter-Branch Transfer Consignments
            </h3>
            <p className="text-xs text-slate-400">
              Click any Master QR Pass button to view or print the 203 DPI thermal gate pass label
            </p>
          </div>
          <button
            onClick={() => onNavigateTab('dispatch')}
            className="text-xs font-semibold text-indigo-400 hover:text-indigo-300 cursor-pointer"
          >
            + Create New Transfer Pass →
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-950/60 text-slate-400 text-xs uppercase tracking-wider border-b border-slate-800">
                <th className="py-3.5 px-4">Gate Pass ID</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4">Style & Color</th>
                <th className="py-3.5 px-4">Inter-Branch Route</th>
                <th className="py-3.5 px-4">Vehicle & Driver</th>
                <th className="py-3.5 px-4 text-right">Dispatched</th>
                <th className="py-3.5 px-4 text-right">Received</th>
                <th className="py-3.5 px-4 text-right">Master QR</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80 text-sm">
              {transfers.map((t) => (
                <tr key={t.id} className="hover:bg-slate-800/40 transition">
                  <td className="py-3.5 px-4 font-mono font-bold text-indigo-300">
                    {t.transferCode}
                  </td>
                  <td className="py-3.5 px-4">
                    <span
                      className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold border ${
                        STATUS_BADGE[t.status] || STATUS_BADGE.CREATED
                      }`}
                    >
                      {t.status}
                    </span>
                  </td>
                  <td className="py-3.5 px-4">
                    <div className="font-semibold text-white">{t.garmentStyle}</div>
                    <div className="text-xs text-slate-400">{t.garmentColor}</div>
                  </td>
                  <td className="py-3.5 px-4">
                    <div className="flex items-center gap-1.5 text-xs font-medium text-slate-200">
                      <span>{t.sourceBranch?.branchName.replace('Trendy ', '')}</span>
                      <ArrowRight className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                      <span>{t.destinationBranch?.branchName.replace('Trendy ', '')}</span>
                    </div>
                    <div className="text-[11px] text-slate-500 mt-0.5">
                      {t.dispatchTimestamp
                        ? `Departed: ${new Date(t.dispatchTimestamp).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}`
                        : 'Awaiting Gate Exit Scan'}
                    </div>
                  </td>
                  <td className="py-3.5 px-4">
                    <div className="font-semibold text-slate-200">{t.vehicle?.registrationNo}</div>
                    <div className="text-xs text-slate-400">
                      {t.vehicle?.driverName} ({t.vehicle?.driverPhone})
                    </div>
                  </td>
                  <td className="py-3.5 px-4 text-right font-bold text-white">
                    {t.dispatchedQty.toLocaleString()} pcs
                  </td>
                  <td className="py-3.5 px-4 text-right">
                    {t.receivedQty !== null ? (
                      <span
                        className={`font-bold ${
                          t.receivedQty === t.dispatchedQty ? 'text-emerald-400' : 'text-rose-400'
                        }`}
                      >
                        {t.receivedQty.toLocaleString()} pcs
                      </span>
                    ) : (
                      <span className="text-xs text-slate-500 italic">Pending</span>
                    )}
                  </td>
                  <td className="py-3.5 px-4 text-right">
                    <button
                      onClick={() => onOpenPass(t.id)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-500/15 hover:bg-indigo-500/30 text-indigo-300 border border-indigo-500/30 text-xs font-semibold transition cursor-pointer"
                    >
                      <QrCode className="w-3.5 h-3.5" />
                      QR Pass
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
