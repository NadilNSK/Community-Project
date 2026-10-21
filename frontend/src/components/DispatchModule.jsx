import React, { useState, useMemo, useEffect } from 'react';
import {
  QrCode,
  Printer,
  PlusCircle,
  ShieldCheck,
  Truck,
  PackageCheck,
  Copy,
  Check,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Clock,
} from 'lucide-react';
import { apiRequest } from '../api/client';

export default function DispatchModule({
  user,
  branches,
  vehicles,
  transfers,
  activePass,
  setActivePass,
  onTransferCreated,
  onOpenPass,
}) {
  const [garmentStyle, setGarmentStyle] = useState('TR-DENIM-501 (Slim Tapered Jeans)');
  const [garmentColor, setGarmentColor] = useState('Dark Vintage Wash');
  const [sizes, setSizes] = useState({ S: 300, M: 500, L: 450, XL: 250 });
  const [sourceBranchId, setSourceBranchId] = useState(
    user?.assignedBranchId || branches[0]?.id || ''
  );
  const [destinationBranchId, setDestinationBranchId] = useState(
    branches.find((b) => b.branchType === 'WASHING')?.id || branches[1]?.id || ''
  );
  const [expectedTransitMinutes, setExpectedTransitMinutes] = useState(120);
  const [notes, setNotes] = useState('Consolidated bundle transfer — sealed container lorry');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [copiedPayload, setCopiedPayload] = useState(false);
  const [showInbound, setShowInbound] = useState(true);

  // Dynamic location-scoped yard fleet state
  const [yardData, setYardData] = useState({ inYard: [], inbound: [] });
  const [loadingYard, setLoadingYard] = useState(false);

  // Fetch vehicles physically inside this officer's facility and idle
  useEffect(() => {
    let isMounted = true;
    const fetchYardVehicles = async () => {
      if (!sourceBranchId) return;
      setLoadingYard(true);
      try {
        const res = await apiRequest(`/api/vehicles/available?branchId=${sourceBranchId}`);
        if (isMounted && res && Array.isArray(res.inYard)) {
          setYardData({
            inYard: res.inYard,
            inbound: res.inbound || [],
          });
        }
      } catch (err) {
        // Fallback to client-side filtering if offline or API error
        if (isMounted) {
          const activeTransfers = (transfers || []).filter(
            (t) => t.status !== 'RECEIVED' && t.status !== 'RESOLVED'
          );
          const filteredInYard = (vehicles || [])
            .filter((v) => {
              const matchesBranch = (v.currentBranchId || v.currentBranch?.id) === sourceBranchId;
              const isNotActive = !activeTransfers.some(
                (t) => t.vehicleId === v.id || t.vehicle?.id === v.id
              );
              return matchesBranch && isNotActive && v.status !== 'IN_TRANSIT' && v.status !== 'MAINTENANCE';
            })
            .map((v) => ({
              ...v,
              registrationNumber: v.registrationNo,
              checkedInTime: '08:30 AM',
              stateDescription: 'Idle / Ready to load',
            }));

          const inTransitVehicles = (vehicles || [])
            .filter((v) => {
              const active = activeTransfers.find(
                (t) => (t.vehicleId === v.id || t.vehicle?.id === v.id) && t.destinationBranchId === sourceBranchId
              );
              return Boolean(active);
            })
            .map((v) => {
              const t = activeTransfers.find(
                (tx) => (tx.vehicleId === v.id || tx.vehicle?.id === v.id) && tx.destinationBranchId === sourceBranchId
              );
              return {
                ...v,
                registrationNumber: v.registrationNo,
                originPlant: t?.sourceBranch?.branchName || 'Origin Facility',
                activeConsignment: {
                  transferCode: t?.transferCode,
                  etaMinutes: 25,
                  etaFormatted: `Expected arrival in ~25 mins (${t?.transferCode})`,
                },
              };
            });

          setYardData({
            inYard: filteredInYard,
            inbound: inTransitVehicles,
          });
        }
      } finally {
        if (isMounted) setLoadingYard(false);
      }
    };

    fetchYardVehicles();
    return () => {
      isMounted = false;
    };
  }, [sourceBranchId, transfers, vehicles]);

  const inYardVehicles = yardData.inYard;
  const inboundVehicles = yardData.inbound;
  const [vehicleId, setVehicleId] = useState(inYardVehicles[0]?.id || '');

  // Keep vehicleId synced with in-yard vehicles
  useEffect(() => {
    if (inYardVehicles.length > 0 && !inYardVehicles.some((v) => v.id === vehicleId)) {
      setVehicleId(inYardVehicles[0]?.id || '');
    } else if (inYardVehicles.length === 0) {
      setVehicleId('');
    }
  }, [inYardVehicles, vehicleId]);

  const noVehiclesAvailable = inYardVehicles.length === 0;

  const currentOriginBranch =
    branches.find((b) => b.id === sourceBranchId) || user?.assignedBranch || branches[0];
  const originBranchName = currentOriginBranch?.branchName || 'Adhikarigama Sewing Plant';

  const totalPieces =
    (Number(sizes.S) || 0) +
    (Number(sizes.M) || 0) +
    (Number(sizes.L) || 0) +
    (Number(sizes.XL) || 0);

  const handleSizeChange = (sizeKey, value) => {
    setSizes((prev) => ({
      ...prev,
      [sizeKey]: Math.max(0, Number(value) || 0),
    }));
  };

  const handleCreateDispatch = async (e) => {
    e.preventDefault();
    setError('');

    // Prevent submission if no vehicle is selected or available
    if (!vehicleId || noVehiclesAvailable) {
      setError('No available fleet vehicles. All assigned vehicles are currently in transit.');
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
          sourceBranchId: sourceBranchId || branches[0]?.id,
          destinationBranchId,
          vehicleId,
          expectedTransitMinutes,
          notes,
        }),
      });
      setActivePass(created);
      // After successful dispatch, the vehicle is now in LOADING/IN_USE.
      // Select next available vehicle for convenience.
      const remaining = inYardVehicles.filter((v) => v.id !== vehicleId);
      setVehicleId(remaining[0]?.id || '');
      onTransferCreated();
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleCopyPayload = () => {
    if (!activePass?.qrPayload) return;
    navigator.clipboard.writeText(activePass.qrPayload);
    setCopiedPayload(true);
    setTimeout(() => setCopiedPayload(false), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Module Header */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 no-print">
        <h2 className="text-xl font-bold text-white">
          Dispatch Consignment & Gate Pass
        </h2>
        <p className="text-xs text-slate-400 mt-0.5">
          Issue and print Master Transfer QR Gate Passes for inter-branch shipments
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Dispatch Creation Form */}
        <form
          onSubmit={handleCreateDispatch}
          className="lg:col-span-7 bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-5 no-print"
        >
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <PlusCircle className="w-5 h-5 text-indigo-400" />
              New Transfer Consignment Details
            </h3>
            <span className="text-xs font-mono px-2.5 py-1 rounded-md bg-indigo-500/15 text-indigo-300 border border-indigo-500/30">
              Total: {totalPieces.toLocaleString()} Pieces
            </span>
          </div>

          {error && (
            <div className="p-3.5 rounded-xl bg-rose-500/15 border border-rose-500/40 text-rose-200 text-sm">
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                Garment Style / Buyer PO *
              </label>
              <input
                type="text"
                required
                value={garmentStyle}
                onChange={(e) => setGarmentStyle(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-sm focus:border-indigo-500 focus:outline-none"
                placeholder="e.g., TR-DENIM-JKT-402"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                Garment Color / Wash Type *
              </label>
              <input
                type="text"
                required
                value={garmentColor}
                onChange={(e) => setGarmentColor(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-sm focus:border-indigo-500 focus:outline-none"
                placeholder="e.g., Indigo Raw Unwashed"
              />
            </div>
          </div>

          {/* Size Breakdown Grid */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
              Size Breakdown (Piece Count per Size Bundle) *
            </label>
            <div className="grid grid-cols-4 gap-3">
              {['S', 'M', 'L', 'XL'].map((sz) => (
                <div
                  key={sz}
                  className="bg-slate-950 border border-slate-800 rounded-xl p-3 text-center"
                >
                  <div className="text-xs font-bold text-indigo-400 mb-1">SIZE {sz}</div>
                  <input
                    type="number"
                    min="0"
                    value={sizes[sz]}
                    onChange={(e) => handleSizeChange(sz, e.target.value)}
                    className="w-full text-center font-bold text-lg text-white bg-slate-900 border border-slate-700 rounded-lg py-1.5 focus:border-indigo-500 focus:outline-none"
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Source & Destination Branches */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                Source Plant (Dispatching Branch) *
              </label>
              <select
                value={sourceBranchId}
                onChange={(e) => setSourceBranchId(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-sm focus:border-indigo-500 focus:outline-none"
              >
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.branchName} ({b.branchType})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                Target Plant (Destination Branch) *
              </label>
              <select
                value={destinationBranchId}
                onChange={(e) => setDestinationBranchId(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-sm focus:border-indigo-500 focus:outline-none"
              >
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.branchName} ({b.branchType})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Section 03: Dedicated Yard Fleet Presence Selector */}
          <div className="space-y-3 pt-2">
            {/* Location-Scoped Vehicle Header */}
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-300">
                Vehicles Currently in Yard ({originBranchName}):{' '}
                <span className="text-emerald-400 font-extrabold">
                  {inYardVehicles.length} Available
                </span>
              </label>
              <span className="text-[11px] text-slate-400 font-mono">
                Gate Event Synced
              </span>
            </div>

            {/* Zero State Alert Banner */}
            {noVehiclesAvailable && !loadingYard ? (
              <div className="p-4 rounded-xl bg-amber-500/15 border border-amber-500/40 text-amber-200 text-sm flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
                <div>
                  <div className="font-semibold text-amber-300">Yard Fleet Empty</div>
                  <div className="text-xs text-amber-200/90 mt-0.5">
                    No fleet vehicles currently parked in this yard. All vehicles are on transit.
                  </div>
                </div>
              </div>
            ) : (
              /* Selectable Vehicle Cards */
              <div className="space-y-2.5">
                {inYardVehicles.map((v) => {
                  const isSelected = vehicleId === v.id;
                  return (
                    <div
                      key={v.id}
                      onClick={() => setVehicleId(v.id)}
                      className={`p-3.5 rounded-xl border transition cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                        isSelected
                          ? 'border-emerald-500 bg-emerald-950/20 ring-1 ring-emerald-500/50 shadow-md shadow-emerald-950/50'
                          : 'border-slate-800 bg-slate-950/70 hover:border-slate-700 hover:bg-slate-900/50'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div
                          className={`w-5 h-5 rounded-full border mt-0.5 flex items-center justify-center flex-shrink-0 ${
                            isSelected
                              ? 'border-emerald-500 bg-emerald-600 text-white'
                              : 'border-slate-700 bg-slate-900 text-transparent'
                          }`}
                        >
                          <div className="w-2 h-2 rounded-full bg-white" />
                        </div>
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <Truck className={`w-4 h-4 ${isSelected ? 'text-emerald-400' : 'text-slate-400'}`} />
                            <span className="font-mono font-bold text-white text-sm">
                              Lorry Number: {v.registrationNo || v.registrationNumber}
                            </span>
                            <span className="text-xs text-slate-300">
                              ({v.driverName} • {v.driverPhone})
                            </span>
                          </div>
                          <div className="text-xs text-slate-400 mt-1 flex items-center gap-2">
                            <span>
                              Bay / State:{' '}
                              <strong className="text-slate-300">
                                {v.stateDescription || 'Idle / Ready to load'}
                              </strong>
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Status Badge: In Yard */}
                      <div className="flex items-center sm:self-center self-start">
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/15 border border-emerald-500/30 text-emerald-300">
                          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                          In Yard • Ready to Load
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Inbound / Inactive Vehicle Cards (Visual transparency) */}
            {inboundVehicles.length > 0 && (
              <div className="pt-2 border-t border-slate-800/80">
                <button
                  type="button"
                  onClick={() => setShowInbound(!showInbound)}
                  className="flex items-center gap-2 text-xs font-semibold text-slate-400 hover:text-slate-200 transition mb-2"
                >
                  {showInbound ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                  <span>Inbound to Yard ({inboundVehicles.length})</span>
                </button>

                {showInbound && (
                  <div className="space-y-2">
                    {inboundVehicles.map((v) => (
                      <div
                        key={v.id}
                        className="p-3.5 rounded-xl border border-slate-800 bg-slate-950/40 opacity-50 cursor-not-allowed select-none flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                      >
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <Truck className="w-4 h-4 text-slate-500" />
                            <span className="font-mono font-bold text-slate-300 text-sm">
                              Lorry Number: {v.registrationNo || v.registrationNumber}
                            </span>
                            <span className="text-xs text-slate-400">
                              ({v.driverName})
                            </span>
                          </div>
                          <div className="text-xs text-slate-400 mt-1 flex items-center gap-1.5">
                            <Clock className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />
                            <span>
                              SLA / ETA:{' '}
                              <span className="text-amber-300 font-medium">
                                {v.activeConsignment?.etaFormatted ||
                                  `Expected arrival in ~${v.activeConsignment?.etaMinutes || 25} mins (${v.activeConsignment?.transferCode})`}
                              </span>
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center sm:self-center self-start">
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-sky-500/15 border border-sky-500/30 text-sky-300">
                            <span className="w-2 h-2 rounded-full bg-sky-400" />
                            In Transit • En Route from {v.originPlant || v.activeConsignment?.sourceBranch?.branchName || 'Origin Plant'}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Transit SLA & Notes */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="sm:col-span-1">
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                Transit SLA (Minutes)
              </label>
              <input
                type="number"
                min="15"
                value={expectedTransitMinutes}
                onChange={(e) => setExpectedTransitMinutes(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-sm focus:border-indigo-500 focus:outline-none"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                Dispatch Notes / Seal Number
              </label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-sm focus:border-indigo-500 focus:outline-none"
                placeholder="Optional security seal number or handling notes"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={submitting || noVehiclesAvailable || !vehicleId}
            className={`w-full py-3.5 px-5 rounded-xl ${
              noVehiclesAvailable || !vehicleId
                ? 'bg-slate-700 cursor-not-allowed opacity-50'
                : 'bg-indigo-600 hover:bg-indigo-500 shadow-lg shadow-indigo-600/30 cursor-pointer'
            } text-white font-bold text-sm flex items-center justify-center gap-2 transition`}
          >
            {noVehiclesAvailable || !vehicleId ? (
              <>
                <AlertTriangle className="w-5 h-5 text-amber-400" />
                No Fleet Vehicles Available in Yard
              </>
            ) : (
              <>
                <QrCode className="w-5 h-5" />
                {submitting
                  ? 'Generating Cryptographic Master QR Gate Pass...'
                  : `Generate Master Transfer QR Gate Pass (${totalPieces.toLocaleString()} Pieces)`}
              </>
            )}
          </button>
        </form>

        {/* Right Column: 203 DPI Thermal Master QR Gate Pass Preview & Printer */}
        <div className="lg:col-span-5">
          {activePass ? (
            <div className="bg-white text-slate-950 rounded-2xl p-6 shadow-2xl border-2 border-slate-300 print-only-pass">
              {/* Thermal Label Header */}
              <div className="border-b-2 border-black pb-3 text-center">
                <div className="text-[11px] font-extrabold uppercase tracking-widest text-slate-700">
                  TRENDY (SE APPAREL PVT LTD) • INTER-BRANCH LOGISTICS
                </div>
                <h3 className="text-xl font-black tracking-tight mt-0.5">
                  MASTER TRANSFER GATE PASS
                </h3>
                <div className="inline-block mt-1 px-3 py-0.5 bg-black text-white font-mono text-sm font-bold rounded">
                  {activePass.transferCode}
                </div>
              </div>

              {/* High-Contrast 203 DPI QR Code */}
              <div className="my-4 flex flex-col items-center">
                {activePass.qrDataUrl && (
                  <img
                    src={activePass.qrDataUrl}
                    alt={activePass.transferCode}
                    className="w-52 h-52 border-2 border-black p-1 rounded"
                  />
                )}
                <div className="mt-2 flex items-center gap-1 text-[11px] font-mono text-slate-700">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-700" />
                  <span>HMAC-SHA256: {activePass.qrPassHash?.slice(0, 16)}...</span>
                </div>
              </div>

              {/* Shipment Metadata Table */}
              <div className="border-t-2 border-b-2 border-black py-3 space-y-1.5 text-xs">
                <div className="flex justify-between">
                  <span className="font-bold uppercase text-slate-600">FROM PLANT:</span>
                  <span className="font-bold text-right">{activePass.sourceBranch?.branchName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-bold uppercase text-slate-600">TO PLANT:</span>
                  <span className="font-bold text-right">{activePass.destinationBranch?.branchName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-bold uppercase text-slate-600">STYLE / COLOR:</span>
                  <span className="font-semibold text-right">
                    {activePass.garmentStyle} ({activePass.garmentColor})
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="font-bold uppercase text-slate-600">VEHICLE REG:</span>
                  <span className="font-mono font-bold">{activePass.vehicle?.registrationNo}</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-bold uppercase text-slate-600">DRIVER:</span>
                  <span className="font-semibold">
                    {activePass.vehicle?.driverName} ({activePass.vehicle?.driverPhone})
                  </span>
                </div>
              </div>

              {/* Consolidated Piece Count & Size Breakdown */}
              <div className="py-3 border-b-2 border-black">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-black uppercase">CONSOLIDATED PIECE COUNT:</span>
                  <span className="text-2xl font-black font-mono">
                    {activePass.dispatchedQty?.toLocaleString()} PCS
                  </span>
                </div>
                {activePass.sizeBreakdown && typeof activePass.sizeBreakdown === 'object' && (
                  <div className="grid grid-cols-4 gap-1.5 mt-2 text-center">
                    {Object.entries(activePass.sizeBreakdown).map(([sz, count]) => (
                      <div key={sz} className="border border-black rounded py-1 px-1">
                        <div className="text-[10px] font-bold uppercase">SIZE {sz}</div>
                        <div className="text-xs font-extrabold">{count}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="pt-2 text-[10px] text-slate-600 flex justify-between">
                <span>Issued: {new Date(activePass.createdAt).toLocaleString()}</span>
                <span>203 DPI Thermal Spec</span>
              </div>

              {/* Action Buttons (Hidden when printing) */}
              <div className="mt-4 pt-3 border-t border-slate-200 flex flex-wrap gap-2 no-print">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="flex-1 py-2.5 px-4 rounded-xl bg-slate-950 hover:bg-slate-800 text-white font-bold text-xs flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Printer className="w-4 h-4" />
                  Print 203 DPI Thermal Pass
                </button>
                <button
                  type="button"
                  onClick={handleCopyPayload}
                  className="py-2.5 px-3.5 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-900 font-bold text-xs flex items-center gap-1.5 cursor-pointer"
                >
                  {copiedPayload ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                  {copiedPayload ? 'Copied QR Payload' : 'Copy QR Payload'}
                </button>
              </div>
            </div>
          ) : (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 text-center flex flex-col items-center justify-center h-full no-print">
              <QrCode className="w-16 h-16 text-slate-700 mb-3" />
              <h4 className="text-base font-bold text-slate-300">
                Select or Generate a Master Transfer QR Gate Pass
              </h4>
              <p className="text-xs text-slate-500 mt-1 max-w-xs">
                Fill out the dispatch form on the left or click any consignment below to preview its 203 DPI printable Master QR label.
              </p>
              <div className="mt-6 w-full space-y-2 text-left">
                <div className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                  Recent Gate Passes:
                </div>
                {transfers.slice(0, 4).map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => onOpenPass(t.id)}
                    className="w-full p-3 rounded-xl bg-slate-950 hover:bg-slate-800 border border-slate-800 flex items-center justify-between text-xs transition cursor-pointer"
                  >
                    <div>
                      <span className="font-mono font-bold text-indigo-400">{t.transferCode}</span>
                      <span className="text-slate-300 ml-2">{t.garmentStyle}</span>
                    </div>
                    <span className="font-bold text-white">{t.dispatchedQty} pcs →</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
