import React, { useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Mail,
  UserCheck,
  Truck,
  ShieldAlert,
  ArrowRight,
  Clock,
} from 'lucide-react';
import { apiRequest } from '../api/client';

export default function DiscrepancyModule({ discrepancies, onUpdated }) {
  const [notesById, setNotesById] = useState({});
  const [updatingId, setUpdatingId] = useState(null);

  const handleStatusChange = async (discrepancyId, newStatus) => {
    setUpdatingId(discrepancyId);
    try {
      await apiRequest(`/api/discrepancies/${discrepancyId}/resolve`, {
        method: 'PATCH',
        body: JSON.stringify({
          resolutionStatus: newStatus,
          comments: notesById[discrepancyId] || undefined,
        }),
      });
      onUpdated();
    } catch (err) {
      alert(err.message);
    } finally {
      setUpdatingId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5">
        <h2 className="text-xl font-bold text-white">
          Discrepancy & Shortage Management
        </h2>
        <p className="text-xs text-slate-400 mt-0.5">
          Investigate and resolve piece-count variances across inter-branch shipments
        </p>
      </div>

      {discrepancies.length === 0 ? (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-12 text-center">
          <CheckCircle2 className="w-14 h-14 text-emerald-400 mx-auto mb-3" />
          <h3 className="text-lg font-bold text-white">Zero Active Discrepancies</h3>
          <p className="text-xs text-slate-400 mt-1">
            All inter-branch garment consignments match their dispatched piece counts.
          </p>
        </div>
      ) : (
        <div className="space-y-5">
          {discrepancies.map((d) => {
            const t = d.transfer || {};
            return (
              <div
                key={d.id}
                className={`rounded-2xl border p-6 transition ${
                  d.isResolved
                    ? 'bg-slate-900/70 border-slate-800'
                    : 'bg-slate-900 border-rose-500/40 shadow-lg shadow-rose-950/20'
                }`}
              >
                {/* Top Summary Row */}
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-800 pb-4">
                  <div className="flex items-start gap-3.5">
                    <div
                      className={`p-3 rounded-2xl shrink-0 ${
                        d.isResolved
                          ? 'bg-emerald-500/15 text-emerald-400'
                          : 'bg-rose-500/20 text-rose-400'
                      }`}
                    >
                      {d.isResolved ? (
                        <CheckCircle2 className="w-6 h-6" />
                      ) : (
                        <AlertTriangle className="w-6 h-6" />
                      )}
                    </div>
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-mono font-black text-lg text-white">
                          {t.transferCode}
                        </span>
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${
                            d.resolutionStatus === 'RESOLVED'
                              ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                              : d.resolutionStatus === 'INVESTIGATING'
                              ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                              : 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                          }`}
                        >
                          {d.resolutionStatus}
                        </span>
                        {d.alertSent && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-indigo-500/15 text-indigo-300 border border-indigo-500/30">
                            <Mail className="w-3 h-3" />
                            Automated Management Alert Sent
                          </span>
                        )}
                      </div>
                      <h3 className="text-base font-bold text-slate-100 mt-1">
                        {t.garmentStyle} ({t.garmentColor})
                      </h3>
                      <div className="flex items-center gap-2 text-xs text-slate-400 mt-0.5">
                        <span>{t.sourceBranch?.branchName}</span>
                        <ArrowRight className="w-3.5 h-3.5 text-indigo-400" />
                        <span>{t.destinationBranch?.branchName}</span>
                      </div>
                    </div>
                  </div>

                  {/* Numeric Shortage Comparison Box */}
                  <div className="flex items-center gap-4 bg-slate-950 border border-slate-800 rounded-2xl px-5 py-3">
                    <div className="text-center">
                      <div className="text-[10px] uppercase text-slate-400 font-semibold">
                        Dispatched
                      </div>
                      <div className="text-xl font-black text-white font-mono">
                        {t.dispatchedQty?.toLocaleString()}
                      </div>
                    </div>
                    <div className="text-slate-600 font-bold">vs</div>
                    <div className="text-center">
                      <div className="text-[10px] uppercase text-slate-400 font-semibold">
                        Received
                      </div>
                      <div className="text-xl font-black text-amber-400 font-mono">
                        {t.receivedQty?.toLocaleString()}
                      </div>
                    </div>
                    <div className="border-l border-slate-800 pl-4 text-center">
                      <div className="text-[10px] uppercase text-rose-400 font-bold">
                        {d.shortageCount > 0 ? 'Missing Pieces' : 'Overage'}
                      </div>
                      <div className="text-2xl font-black text-rose-400 font-mono">
                        {d.shortageCount > 0 ? `-${d.shortageCount}` : `+${Math.abs(d.shortageCount)}`} PCS
                      </div>
                    </div>
                  </div>
                </div>

                {/* Instant Accountability & Shortage Triangulation Chain (Section 6.2) */}
                <div className="mt-4">
                  <div className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2.5">
                    Accountability & Custody Triangulation Timeline:
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs">
                    <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                      <div className="text-indigo-400 font-bold uppercase">1. Dispatched By</div>
                      <div className="font-semibold text-white mt-1">
                        {t.dispatchedBy?.fullName || 'Dispatch Officer'}
                      </div>
                      <div className="text-slate-400 mt-0.5">{t.sourceBranch?.branchName}</div>
                    </div>

                    <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                      <div className="text-sky-400 font-bold uppercase">2. Gate Exit Security</div>
                      <div className="font-semibold text-white mt-1">
                        {t.gateOutBy?.fullName || 'Gate Officer'}
                      </div>
                      <div className="text-slate-400 mt-0.5">
                        {t.dispatchTimestamp
                          ? `Exited: ${new Date(t.dispatchTimestamp).toLocaleTimeString()}`
                          : 'Timestamp Logged'}
                      </div>
                    </div>

                    <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                      <div className="text-amber-400 font-bold uppercase">3. Transit Vehicle & Driver</div>
                      <div className="font-semibold text-white mt-1">
                        {t.vehicle?.registrationNo} — {t.vehicle?.driverName}
                      </div>
                      <div className="text-slate-400 mt-0.5">
                        NIC: {t.vehicle?.driverNic} • Tel: {t.vehicle?.driverPhone}
                      </div>
                    </div>

                    <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                      <div className="text-rose-400 font-bold uppercase">4. Intake Verified By</div>
                      <div className="font-semibold text-white mt-1">
                        {d.reportedBy?.fullName || t.receivedBy?.fullName || 'Receiving Officer'}
                      </div>
                      <div className="text-slate-400 mt-0.5">
                        {t.receivedTimestamp
                          ? `Received: ${new Date(t.receivedTimestamp).toLocaleTimeString()}`
                          : 'Destination Bay'}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Audit Comment & Resolution Controls */}
                <div className="mt-4 pt-4 border-t border-slate-800 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  <div className="flex-1">
                    <div className="text-xs font-semibold text-slate-300">{d.comments}</div>
                    <input
                      type="text"
                      value={notesById[d.id] ?? ''}
                      onChange={(e) =>
                        setNotesById((prev) => ({ ...prev, [d.id]: e.target.value }))
                      }
                      placeholder="Add investigation or resolution audit note (e.g., Recounted bundle #14 at Sewing Plant)..."
                      className="mt-2 w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white"
                    />
                  </div>

                  <div className="flex flex-wrap items-center gap-2 shrink-0">
                    <button
                      type="button"
                      disabled={updatingId === d.id}
                      onClick={() => handleStatusChange(d.id, 'INVESTIGATING')}
                      className="px-3.5 py-2 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 text-xs font-bold cursor-pointer"
                    >
                      Mark Investigating
                    </button>
                    <button
                      type="button"
                      disabled={updatingId === d.id}
                      onClick={() => handleStatusChange(d.id, 'RESOLVED')}
                      className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold cursor-pointer"
                    >
                      Resolve & Close Discrepancy
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
