// Figma-only fixtures. Never enqueue or upload these records to the live API.
export const releasedSample = {
  transferId: 'TRF-2610-0418', destination: 'Washing Plant – Katunayake',
  departed: '09:41:12 · 28 Oct', gate: 'Main Gate · Sewing Plant',
  vehicle: 'WP LB-4521', pieces: 1500, bundles: 30, expectedArrival: '11:20',
  receivingGateNotified: true,
};

export const rejectedSample = {
  transferId: 'TRF-2610-0418', signatureValid: true,
  firstExit: '09:41 · Main Gate', vehicle: 'WP CAB-1123', supervisorsAlerted: true,
};

export const queuedSamples = [
  { clientScanId: 'preview-0431', transferId: 'TRF-2610-0431', description: 'Exit · WP CAB-7712 · 1,200 pcs · 13:55' },
  { clientScanId: 'preview-0429', transferId: 'TRF-2610-0429', description: 'Entry · LH-8890 · 640/640 pcs · 13:51' },
  { clientScanId: 'preview-0427', transferId: 'TRF-2610-0427', description: 'Exit · WP LB-3304 · 900 pcs · 13:49' },
];
export const syncedSample = {
  clientScanId: 'preview-0425', transferId: 'TRF-2610-0425', description: 'Exit · WP NB-2210 · 1,000 pcs · 13:46',
};
export const shipmentSamples = [
  { id: 'TRF-2610-0418', from: 'Biyagama', to: 'Katunayake', fromBranch: 'Sewing Plant – Biyagama', toBranch: 'Washing Plant – Katunayake', vehicle: 'WP LB-4521', status: 'In transit', tone: 'info', departure: '09:41', eta: '11:20', pieces: 1500, style: 'ST-7781' },
  { id: 'TRF-2610-0411', from: 'Katunayake', to: 'Kandy', vehicle: 'CP-6630', status: 'Overdue', tone: 'warning', description: 'Katunayake → Kandy · CP-6630' },
  { id: 'TRF-2610-0416', from: 'Biyagama', to: 'Embroidery Sub.', vehicle: '', status: 'In transit', tone: 'info', description: 'Biyagama → Embroidery Sub. · 600 pcs' },
  { id: 'TRF-2610-0415', from: 'Embroidery Sub.', to: 'Biyagama', vehicle: '', status: 'Received', tone: 'success', description: 'Embroidery Sub. → Biyagama · 800/800' },
];
export const shipmentSampleTotals = { total: 23, inTransit: 6, received: 16, flagged: 1 };
