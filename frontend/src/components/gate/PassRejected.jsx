import React, { useState } from 'react';
import { DetailsCard, GateActions, GateButton, GateFrame, GateNotice, ResultHeading, StatusChip } from './GateUI';

export default function PassRejected({ data, preview, phone, onNavigate }) {
  const [contactMissing, setContactMissing] = useState(false);
  return <GateFrame preview={preview} time="09:52">
    <main className="gate-content gate-result-content">
      <ResultHeading title="PASS REJECTED" danger>This gate pass has already been used. Do not release the vehicle.</ResultHeading>
      <DetailsCard danger rows={[
        ['Scanned ID', <span className="gate-mono">{data.transferId}</span>],
        ['Signature', <StatusChip tone={data.signatureValid ? 'success' : 'warning'}>{data.signatureValid ? 'Valid' : 'Not verified'}</StatusChip>],
        ['Pass status', <StatusChip tone="danger" dot>Already exited</StatusChip>],
        ['First exit', data.firstExit], ['Vehicle now', <span className="gate-mono gate-danger-text">{data.vehicle}</span>],
      ]} />
      <GateNotice tone="warning">Possible re-used or copied pass. {data.supervisorsAlerted
        ? 'Your security supervisor and the logistics manager have been alerted.'
        : 'Contact your security supervisor and the logistics manager before taking any further action.'}</GateNotice>
      {contactMissing && <GateNotice tone="warning" role="status">No supervisor phone number is configured. Contact your supervisor using the gate’s approved contact list.</GateNotice>}
    </main>
    <GateActions>
      <GateButton variant="danger" {...(phone ? { href: `tel:${phone}` } : { onClick: () => setContactMissing(true) })}>Call supervisor</GateButton>
      <GateButton variant="secondary" onClick={() => onNavigate('scan')}>Scan again</GateButton>
    </GateActions>
  </GateFrame>;
}
