import React, { useState } from 'react';
import { QrCode, Printer, PlusCircle, ShieldCheck, Truck, PackageCheck, Copy, Check } from 'lucide-react';
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
  const [vehicleId, setVehicleId] = useState(vehicles[0]?.id || '');
  const [expectedTransitMinutes, setExpectedTransitMinutes] = useState(120);
  const [notes, setNotes] = useState('Consolidated bundle transfer — sealed container lorry');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [copiedPayload, setCopiedPayload] = useState(false);

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
          vehicleId: vehicleId || vehicles[0]?.id,
          expectedTransitMinutes,
          notes,
        }),
      });
      setActivePass(created);
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

          {/* Vehicle & Expected Transit SLA */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                Assigned Transport Vehicle & Driver *
              </label>
              <select
                value={vehicleId}
                onChange={(e) => setVehicleId(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-sm focus:border-indigo-500 focus:outline-none"
              >
                {vehicles.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.registrationNo} — {v.driverName} ({v.driverPhone})
                  </option>
                ))}
              </select>
            </div>

            <div>
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
          </div>

          <div>
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

          <button
            type="submit"
            disabled={submitting}
            className="w-full py-3.5 px-5 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/30 transition cursor-pointer"
          >
            <QrCode className="w-5 h-5" />
            {submitting
              ? 'Generating Cryptographic Master QR Gate Pass...'
              : `Generate Master Transfer QR Gate Pass (${totalPieces.toLocaleString()} Pieces)`}
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
