const express = require('express');
const crypto = require('crypto');
const prisma = require('../../config/db');
const { authenticateToken, authorizeRoles } = require('../../middleware/auth');

const router = express.Router();

/**
 * Resolves a scanned QR payload (JSON string, transferCode, or qrPassHash)
 * and verifies cryptographic integrity (SR3)
 */
async function resolveAndVerifyQrInput(qrInput) {
  if (!qrInput) {
    throw new Error('Empty QR code payload.');
  }

  let codeOrHash = String(qrInput).trim();
  let providedHash = null;

  if (codeOrHash.startsWith('{')) {
    try {
      const parsed = JSON.parse(codeOrHash);
      codeOrHash = parsed.code || parsed.transferCode || parsed.hash;
      providedHash = parsed.hash || null;
    } catch {
      throw new Error('Malformed QR JSON payload.');
    }
  }

  const consignment = await prisma.transferConsignment.findFirst({
    where: {
      OR: [
        { transferCode: codeOrHash },
        { qrPassHash: codeOrHash },
        { id: codeOrHash },
      ],
    },
    include: {
      sourceBranch: true,
      destinationBranch: true,
      vehicle: true,
      dispatchedBy: { select: { id: true, fullName: true, username: true } },
      gateOutBy: { select: { id: true, fullName: true, username: true } },
      receivedBy: { select: { id: true, fullName: true, username: true } },
      discrepancy: true,
    },
  });

  if (!consignment) {
    throw new Error(`No transfer consignment found matching QR code '${codeOrHash}'.`);
  }

  if (providedHash && providedHash !== consignment.qrPassHash) {
    throw new Error('Tamper Alert (SR3): Cryptographic QR hash signature mismatch!');
  }

  return consignment;
}

/**
 * Core processor for a single scan action (used by live scans and offline PWA sync queue)
 */
async function processScanOperation({
  consignmentId,
  scanType,
  userId,
  recordedQty,
  scannedAt,
  clientScanId,
  wasOfflineQueue = false,
  comments,
}) {
  const timestamp = scannedAt ? new Date(scannedAt) : new Date();
  const dedupId = clientScanId || crypto.randomUUID();

  // Check idempotency if clientScanId already synced (NFR4)
  const existingLog = await prisma.scanAuditLog.findUnique({
    where: { clientScanId: dedupId },
  });
  if (existingLog) {
    const current = await prisma.transferConsignment.findUnique({
      where: { id: consignmentId },
      include: { sourceBranch: true, destinationBranch: true, vehicle: true, discrepancy: true },
    });
    return { consignment: current, duplicate: true };
  }

  const consignment = await prisma.transferConsignment.findUnique({
    where: { id: consignmentId },
    include: { sourceBranch: true, destinationBranch: true, vehicle: true },
  });

  if (!consignment) {
    throw new Error('Consignment not found.');
  }

  let updatedConsignment = null;
  let discrepancyCreated = null;

  if (scanType === 'DEPARTURE_OUT') {
    updatedConsignment = await prisma.transferConsignment.update({
      where: { id: consignment.id },
      data: {
        status: consignment.status === 'CREATED' ? 'IN_TRANSIT' : consignment.status,
        dispatchTimestamp: consignment.dispatchTimestamp || timestamp,
        gateOutById: userId,
      },
      include: { sourceBranch: true, destinationBranch: true, vehicle: true, discrepancy: true },
    });
  } else if (scanType === 'DESTINATION_IN') {
    updatedConsignment = await prisma.transferConsignment.update({
      where: { id: consignment.id },
      data: {
        gateInTimestamp: consignment.gateInTimestamp || timestamp,
      },
      include: { sourceBranch: true, destinationBranch: true, vehicle: true, discrepancy: true },
    });
  } else if (scanType === 'INTAKE_VERIFICATION') {
    const verifiedQty = Number(recordedQty);
    if (Number.isNaN(verifiedQty) || verifiedQty < 0) {
      throw new Error('A valid physical piece count is required for intake verification.');
    }

    const shortageCount = consignment.dispatchedQty - verifiedQty;
    const hasDiscrepancy = shortageCount !== 0;
    const newStatus = hasDiscrepancy ? 'DISCREPANCY' : 'RECEIVED';

    updatedConsignment = await prisma.transferConsignment.update({
      where: { id: consignment.id },
      data: {
        receivedQty: verifiedQty,
        status: newStatus,
        gateInTimestamp: consignment.gateInTimestamp || timestamp,
        receivedTimestamp: timestamp,
        receivedById: userId,
      },
      include: { sourceBranch: true, destinationBranch: true, vehicle: true },
    });

    if (hasDiscrepancy) {
      discrepancyCreated = await prisma.discrepancyLog.upsert({
        where: { transferId: consignment.id },
        update: {
          shortageCount,
          resolutionStatus: 'OPEN',
          isResolved: false,
          comments:
            comments ||
            `Automated Discrepancy Alert: Dispatched ${consignment.dispatchedQty} pcs vs Received ${verifiedQty} pcs (${
              shortageCount > 0 ? `${shortageCount} pcs missing` : `${Math.abs(shortageCount)} pcs excess`
            }).`,
          alertSent: true,
          reportedById: userId,
        },
        create: {
          transferId: consignment.id,
          shortageCount,
          resolutionStatus: 'OPEN',
          isResolved: false,
          comments:
            comments ||
            `Automated Discrepancy Alert: Dispatched ${consignment.dispatchedQty} pcs vs Received ${verifiedQty} pcs (${
              shortageCount > 0 ? `${shortageCount} pcs missing` : `${Math.abs(shortageCount)} pcs excess`
            }).`,
          alertSent: true,
          reportedById: userId,
          timestamp,
        },
      });
    }
  } else {
    throw new Error(`Unsupported scanType: ${scanType}`);
  }

  await prisma.scanAuditLog.create({
    data: {
      clientScanId: dedupId,
      transferId: consignment.id,
      scanType,
      scannedById: userId,
      recordedQty: recordedQty !== undefined && recordedQty !== null ? Number(recordedQty) : null,
      wasOfflineQueue: Boolean(wasOfflineQueue),
      scannedAt: timestamp,
    },
  });

  const finalConsignment = await prisma.transferConsignment.findUnique({
    where: { id: consignment.id },
    include: {
      sourceBranch: true,
      destinationBranch: true,
      vehicle: true,
      dispatchedBy: { select: { id: true, fullName: true, username: true } },
      gateOutBy: { select: { id: true, fullName: true, username: true } },
      receivedBy: { select: { id: true, fullName: true, username: true } },
      discrepancy: true,
    },
  });

  return {
    consignment: finalConsignment,
    discrepancy: discrepancyCreated,
    duplicate: false,
  };
}

/**
 * POST /api/scanner/verify-qr
 * Validates QR payload & returns full consignment info before guard/receiver confirms action
 */
router.post('/verify-qr', authenticateToken, async (req, res) => {
  try {
    const { qrPayload } = req.body;
    const consignment = await resolveAndVerifyQrInput(qrPayload);
    res.json({
      verified: true,
      consignment,
    });
  } catch (err) {
    res.status(400).json({
      verified: false,
      error: err.message || 'QR verification failed.',
    });
  }
});

/**
 * POST /api/scanner/gate-out
 * FR3: Gate Security Officer scans Master QR Code at departure gate -> Status: IN_TRANSIT
 */
router.post(
  '/gate-out',
  authenticateToken,
  authorizeRoles('GATE_SECURITY', 'DISPATCH_OFFICER', 'LOGISTICS_MANAGER', 'SYSTEM_ADMIN'),
  async (req, res) => {
    try {
      const { qrPayload, clientScanId, scannedAt } = req.body;
      const consignment = await resolveAndVerifyQrInput(qrPayload);

      const result = await processScanOperation({
        consignmentId: consignment.id,
        scanType: 'DEPARTURE_OUT',
        userId: req.user.id,
        scannedAt,
        clientScanId,
        wasOfflineQueue: false,
      });

      res.json({
        message: `Consignment ${consignment.transferCode} marked IN-TRANSIT from ${consignment.sourceBranch.branchName}.`,
        ...result,
      });
    } catch (err) {
      res.status(400).json({ error: err.message || 'Gate-Out scan failed.' });
    }
  }
);

/**
 * POST /api/scanner/gate-in
 * Gate Security Officer scans Master QR Code at destination gate entry
 */
router.post(
  '/gate-in',
  authenticateToken,
  authorizeRoles('GATE_SECURITY', 'RECEIVING_OFFICER', 'LOGISTICS_MANAGER', 'SYSTEM_ADMIN'),
  async (req, res) => {
    try {
      const { qrPayload, clientScanId, scannedAt } = req.body;
      const consignment = await resolveAndVerifyQrInput(qrPayload);

      const result = await processScanOperation({
        consignmentId: consignment.id,
        scanType: 'DESTINATION_IN',
        userId: req.user.id,
        scannedAt,
        clientScanId,
        wasOfflineQueue: false,
      });

      res.json({
        message: `Vehicle arrival logged at ${consignment.destinationBranch.branchName} gate.`,
        ...result,
      });
    } catch (err) {
      res.status(400).json({ error: err.message || 'Gate-In scan failed.' });
    }
  }
);

/**
 * POST /api/scanner/receive
 * FR4 & FR5: Receiving Officer scans QR and inputs verified physical piece count
 */
router.post(
  '/receive',
  authenticateToken,
  authorizeRoles('RECEIVING_OFFICER', 'GATE_SECURITY', 'LOGISTICS_MANAGER', 'SYSTEM_ADMIN'),
  async (req, res) => {
    try {
      const { qrPayload, receivedQty, comments, clientScanId, scannedAt } = req.body;
      const consignment = await resolveAndVerifyQrInput(qrPayload);

      const result = await processScanOperation({
        consignmentId: consignment.id,
        scanType: 'INTAKE_VERIFICATION',
        userId: req.user.id,
        recordedQty: receivedQty,
        scannedAt,
        clientScanId,
        wasOfflineQueue: false,
        comments,
      });

      const hasDiscrepancy = result.consignment.status === 'DISCREPANCY';
      res.json({
        message: hasDiscrepancy
          ? `DISCREPANCY DETECTED! Dispatched ${consignment.dispatchedQty} pcs vs Received ${receivedQty} pcs. Management alert triggered.`
          : `Consignment ${consignment.transferCode} verified and RECEIVED (${receivedQty} pcs matched).`,
        ...result,
      });
    } catch (err) {
      res.status(400).json({ error: err.message || 'Receiving intake scan failed.' });
    }
  }
);

/**
 * POST /api/scanner/sync
 * NFR4: Synchronizes offline-queued PWA scan records upon network reconnection
 */
router.post('/sync', authenticateToken, async (req, res) => {
  try {
    const { queuedScans } = req.body;
    if (!Array.isArray(queuedScans) || queuedScans.length === 0) {
      return res.json({ syncedCount: 0, results: [] });
    }

    const results = [];
    for (const item of queuedScans) {
      try {
        const consignment = await resolveAndVerifyQrInput(item.qrPayload);
        const processed = await processScanOperation({
          consignmentId: consignment.id,
          scanType: item.scanType,
          userId: req.user.id,
          recordedQty: item.receivedQty,
          scannedAt: item.scannedAt,
          clientScanId: item.clientScanId,
          wasOfflineQueue: true,
          comments: item.comments,
        });
        results.push({
          clientScanId: item.clientScanId,
          status: 'SYNCED',
          transferCode: consignment.transferCode,
          resultStatus: processed.consignment.status,
        });
      } catch (itemErr) {
        results.push({
          clientScanId: item.clientScanId,
          status: 'FAILED',
          error: itemErr.message,
        });
      }
    }

    res.json({
      syncedCount: results.filter((r) => r.status === 'SYNCED').length,
      results,
    });
  } catch (err) {
    res.status(500).json({ error: 'Offline sync batch processing failed.' });
  }
});

module.exports = router;
