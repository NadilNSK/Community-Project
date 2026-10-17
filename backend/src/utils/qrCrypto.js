const crypto = require('crypto');
const QRCode = require('qrcode');

const QR_SECRET = process.env.QR_HMAC_SECRET || 'trendy_apparel_master_qr_hmac_secret_2026';

/**
 * Generates an HMAC-SHA256 signature for a transfer consignment (SR3 Anti-Tampering)
 */
function generateConsignmentHash({ transferCode, sourceBranchId, destinationBranchId, dispatchedQty, vehicleId }) {
  const rawPayload = `${transferCode}|${sourceBranchId}|${destinationBranchId}|${dispatchedQty}|${vehicleId}`;
  return crypto
    .createHmac('sha256', QR_SECRET)
    .update(rawPayload)
    .digest('hex')
    .slice(0, 32);
}

/**
 * Builds the JSON payload encoded inside the Master Transfer QR Code
 */
function buildQrPayload(consignment) {
  return JSON.stringify({
    v: 1,
    code: consignment.transferCode,
    hash: consignment.qrPassHash,
    qty: consignment.dispatchedQty,
  });
}

/**
 * Renders a crisp high-density QR code Data URL suitable for 203 DPI thermal printers (Section 4.1)
 */
async function generateQrDataUrl(consignment) {
  const payload = buildQrPayload(consignment);
  return QRCode.toDataURL(payload, {
    errorCorrectionLevel: 'H',
    margin: 2,
    width: 360,
    color: {
      dark: '#000000',
      light: '#FFFFFF',
    },
  });
}

module.exports = {
  generateConsignmentHash,
  buildQrPayload,
  generateQrDataUrl,
};
