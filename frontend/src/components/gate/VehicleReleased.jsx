import React from 'react';
import { DetailsCard, GateActions, GateButton, GateFrame, GateNotice, ResultHeading, StatusChip } from './GateUI';

export default function VehicleReleased({ data, preview, onNavigate }) {
  return <GateFrame preview={preview} time="09:41">
    <main className="gate-content gate-result-content">
      <ResultHeading title="VEHICLE RELEASED">{data.transferId} is now in transit to {data.destination}.</ResultHeading>
      <DetailsCard rows={[
        ['Status', <StatusChip dot>In transit</StatusChip>], ['Departed', data.departed], ['Gate', data.gate],
        ['Vehicle', <span className="gate-mono">{data.vehicle}</span>],
        ['Pieces', `${data.pieces?.toLocaleString('en-GB') ?? '—'}${data.bundles != null ? ` · ${data.bundles} bundles` : ''}`],
        ['Expected arrival', data.expectedArrival],
      ]} />
      <GateNotice>{data.receivingGateNotified
        ? 'Receiving gate at Washing Plant has been notified. Shortages on arrival are flagged automatically.'
        : 'Departure is recorded. Shortages on arrival are flagged automatically during intake verification.'}</GateNotice>
    </main>
    <GateActions><GateButton onClick={() => onNavigate('scan')}>Scan next vehicle</GateButton><GateButton variant="secondary" onClick={() => onNavigate('home')}>Back to home</GateButton></GateActions>
  </GateFrame>;
}
