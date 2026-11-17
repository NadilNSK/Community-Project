import React, { useState } from 'react';
import { filterShipments, gateDay, shipmentFromTransfer } from '../../api/gateData';
import { shipmentSamples, shipmentSampleTotals } from '../../data/gateSamples';
import { CompactRow, GateAsset, GateBottomNav, GateFrame, GateHeader, StatusChip } from './GateUI';

function FeaturedShipment({ shipment }) {
  return <article className="gate-featured-shipment" aria-label={`Shipment ${shipment.id}`}>
    <div className="gate-featured-heading"><h2 className="gate-mono">{shipment.id}</h2><StatusChip tone={shipment.tone} dot={shipment.tone !== 'neutral'}>{shipment.status}</StatusChip></div>
    <div className="gate-route">
      <div className="gate-route-stop"><span>From</span><strong>{shipment.from}</strong><small>{shipment.departure}</small></div>
      <div className="gate-route-progress" aria-hidden="true"><div className="gate-route-line" /><div className="gate-route-vehicle"><GateAsset name="route-vehicle" /></div></div>
      <div className="gate-route-stop gate-route-destination"><span>To</span><strong>{shipment.to}</strong><small>ETA {shipment.eta}</small></div>
    </div>
    <div className="gate-shipment-footer"><p><strong>{shipment.pieces?.toLocaleString('en-GB') ?? '—'}</strong> pcs{shipment.style && ` · ${shipment.style}`}</p><strong className="gate-mono">{shipment.vehicle}</strong></div>
  </article>;
}

export default function Shipments({ preview, transfers, onNavigate, loadError, onRefresh }) {
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState('');
  const today = transfers.filter((transfer) => gateDay(transfer.dispatchTimestamp || transfer.createdAt) === gateDay(Date.now()));
  const shipments = preview ? shipmentSamples : today.map(shipmentFromTransfer);
  const totals = preview ? shipmentSampleTotals : {
    total: today.length, inTransit: today.filter((item) => item.status === 'IN_TRANSIT').length,
    received: today.filter((item) => ['RECEIVED', 'RESOLVED'].includes(item.status)).length,
    flagged: today.filter((item) => item.status === 'DISCREPANCY').length,
  };
  const results = filterShipments(shipments, query);
  const featuredId = shipments.find((item) => item.status === 'In transit')?.id || shipments[0]?.id;
  const featured = results.find((item) => item.id === featuredId);

  return <GateFrame preview={preview} time="10:15">
    <GateHeader title="Shipments" subtitle={`Today · ${totals.total} transfers`} className="gate-shipments-header">
      <button type="button" className="gate-icon-button" aria-label={searchOpen ? 'Close shipment search' : 'Search shipments'} aria-expanded={searchOpen}
        onClick={() => { setSearchOpen(!searchOpen); setQuery(''); }}><GateAsset name="search" /></button>
    </GateHeader>
    {searchOpen && <div className="gate-search"><label htmlFor="shipment-search" className="sr-only">Search by transfer ID, route, or vehicle</label>
      <input id="shipment-search" type="search" autoFocus value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Transfer ID, route, or vehicle" />
      <p role="status">{results.length} matching {results.length === 1 ? 'transfer' : 'transfers'}</p>
    </div>}
    <main className="gate-content gate-shipments-content">
      <dl className="gate-totals">
        {[['In transit', totals.inTransit, 'info'], ['Received', totals.received, 'success'], ['Flagged', totals.flagged, 'danger']].map(([label, value, tone]) =>
          <div key={label} className={`gate-tone-${tone}`}><dt>{label}</dt><dd>{value}</dd></div>)}
      </dl>
      {!preview && loadError && <p className="gate-notice gate-tone-warning" role="status">{loadError} <button type="button" className="underline font-bold" onClick={onRefresh}>Retry loading</button></p>}
      {featured && <FeaturedShipment shipment={featured} />}
      <ul className="gate-shipment-list" aria-label="Shipments">
        {results.filter((item) => item.id !== featuredId).map((item) => <CompactRow key={item.id} title={item.id} description={item.description} status={item.status} tone={item.tone} />)}
      </ul>
      {!results.length && <p className="gate-empty" role="status">{query ? 'No shipments match your search.' : 'No transfers recorded today.'}</p>}
    </main>
    <GateBottomNav active="shipments" onNavigate={onNavigate} />
  </GateFrame>;
}
