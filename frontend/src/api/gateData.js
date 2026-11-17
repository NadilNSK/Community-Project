const timeOptions = { timeZone: 'Asia/Colombo', hour12: false, hour: '2-digit', minute: '2-digit' };
export const formatGateTime = (value, seconds = false) => value
  ? new Date(value).toLocaleTimeString('en-GB', { ...timeOptions, ...(seconds ? { second: '2-digit' } : {}) }) : '—';
export const gateDay = (value) => new Date(value).toLocaleDateString('en-CA', { timeZone: 'Asia/Colombo' });

function arrivalTime(transfer) {
  return transfer.dispatchTimestamp && transfer.expectedTransitMinutes != null
    ? new Date(new Date(transfer.dispatchTimestamp).getTime() + transfer.expectedTransitMinutes * 60000).toISOString() : null;
}

export function releasedFromTransfer(transfer) {
  const date = transfer.dispatchTimestamp;
  return {
    transferId: transfer.transferCode,
    destination: transfer.destinationBranch?.branchName || 'the destination plant',
    departed: date ? `${formatGateTime(date, true)} · ${new Date(date).toLocaleDateString('en-GB', { timeZone: 'Asia/Colombo', day: 'numeric', month: 'short' })}` : '—',
    gate: transfer.gateName || transfer.sourceBranch?.branchName || '—',
    vehicle: transfer.vehicle?.registrationNo || '—', pieces: transfer.dispatchedQty,
    bundles: transfer.bundleCount, expectedArrival: formatGateTime(arrivalTime(transfer)),
    receivingGateNotified: transfer.receivingGateNotified === true,
  };
}

export function rejectedFromTransfer(transfer, signatureValid) {
  return {
    transferId: transfer.transferCode, signatureValid,
    firstExit: `${formatGateTime(transfer.dispatchTimestamp)} · ${transfer.gateName || transfer.sourceBranch?.branchName || 'Departure gate'}`,
    // Only an observed plate may be called the current vehicle. The API currently
    // supplies the assigned vehicle, not the plate observed by the gate officer.
    vehicle: transfer.observedVehiclePlate || 'Not recorded', supervisorsAlerted: false,
  };
}

export function shipmentFromTransfer(transfer) {
  const from = transfer.sourceBranch?.location || transfer.sourceBranch?.branchName || 'Unknown origin';
  const to = transfer.destinationBranch?.location || transfer.destinationBranch?.branchName || 'Unknown destination';
  const eta = arrivalTime(transfer);
  const overdue = transfer.status === 'IN_TRANSIT' && eta && new Date(eta).getTime() < Date.now();
  const statuses = { IN_TRANSIT: ['In transit', 'info'], RECEIVED: ['Received', 'success'], DISCREPANCY: ['Flagged', 'danger'], RESOLVED: ['Received', 'success'], CREATED: ['Created', 'neutral'] };
  const [status, tone] = overdue ? ['Overdue', 'warning'] : statuses[transfer.status] || ['Pending', 'neutral'];
  const vehicle = transfer.vehicle?.registrationNo || '—';
  return {
    id: transfer.transferCode, from, to, fromBranch: transfer.sourceBranch?.branchName,
    toBranch: transfer.destinationBranch?.branchName, vehicle, status, tone,
    departure: formatGateTime(transfer.dispatchTimestamp), eta: formatGateTime(eta),
    pieces: transfer.dispatchedQty, style: transfer.garmentStyle,
    description: `${from} → ${to} · ${vehicle}`,
  };
}

export function filterShipments(shipments, query) {
  const normalize = (value) => String(value || '').toLocaleLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim();
  const words = normalize(query).split(/\s+/).filter(Boolean);
  return shipments.filter((item) => {
    const text = normalize([item.id, item.from, item.to, item.fromBranch, item.toBranch, item.vehicle].join(' '));
    return words.every((word) => text.includes(word));
  });
}

export function queueRowFromScan(scan, transfers) {
  let code = scan.qrPayload;
  try { const payload = JSON.parse(code); code = payload.code || payload.transferCode || payload.hash; } catch { /* Plain transfer code. */ }
  const transfer = transfers.find((item) => [item.transferCode, item.id, item.qrPassHash].includes(code));
  const type = scan.scanType === 'DEPARTURE_OUT' ? 'Exit' : 'Entry';
  const count = scan.receivedQty != null ? `${scan.receivedQty}/${transfer?.dispatchedQty ?? '?'}` : transfer?.dispatchedQty?.toLocaleString('en-GB');
  return { ...scan, transferId: transfer?.transferCode || code || 'Unrecognized pass', description: [type, transfer?.vehicle?.registrationNo, count && `${count} pcs`, formatGateTime(scan.scannedAt)].filter(Boolean).join(' · ') };
}

export function supervisorPhone(user) {
  // Demo contact requested for this implementation; configure before live use.
  const configured = user?.supervisorPhone || import.meta.env?.VITE_GATE_SUPERVISOR_PHONE || '+94770000000';
  const phone = configured.replace(/[\s().-]/g, '');
  return /^\+?\d{7,15}$/.test(phone) ? phone : null;
}
