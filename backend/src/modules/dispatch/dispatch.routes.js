const express = require('express');
const prisma = require('../../config/db');
const { authenticateToken, authorizeRoles } = require('../../middleware/auth');
const { generateConsignmentHash, buildQrPayload, generateQrDataUrl } = require('../../utils/qrCrypto');

const router = express.Router();

/**
 * Helper to generate human-readable sequential Transfer Gate Pass Code (e.g., GP-2026-0005)
 */
async function generateNextTransferCode() {
  const count = await prisma.transferConsignment.count();
  const nextNumber = String(count + 1).padStart(4, '0');
  return `GP-2026-${nextNumber}`;
}

/**
 * GET /api/transfers
 * List transfer consignments with optional status or branch filtering
 */
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { status, sourceBranchId, destinationBranchId } = req.query;
    const where = {};

    if (status) where.status = status;
    if (sourceBranchId) where.sourceBranchId = sourceBranchId;
    if (destinationBranchId) where.destinationBranchId = destinationBranchId;

    const transfers = await prisma.transferConsignment.findMany({
      where,
      include: {
        sourceBranch: true,
        destinationBranch: true,
        vehicle: true,
        dispatchedBy: { select: { id: true, fullName: true, username: true, role: true } },
        gateOutBy: { select: { id: true, fullName: true, username: true, role: true } },
        receivedBy: { select: { id: true, fullName: true, username: true, role: true } },
        discrepancy: true,
        scanLogs: {
          orderBy: { scannedAt: 'asc' },
          include: {
            scannedBy: { select: { id: true, fullName: true, role: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json(transfers);
  } catch (err) {
    console.error('Error fetching transfers:', err);
    res.status(500).json({ error: 'Failed to fetch transfer consignments.' });
  }
});

/**
 * POST /api/transfers
 * FR1 & FR2: Create new dispatch note and generate tamper-proof Master Transfer QR Code
 */
router.post(
  '/',
  authenticateToken,
  authorizeRoles('DISPATCH_OFFICER', 'LOGISTICS_MANAGER', 'SYSTEM_ADMIN'),
  async (req, res) => {
    try {
      const {
        garmentStyle,
        garmentColor,
        sizeBreakdown,
        dispatchedQty,
        sourceBranchId,
        destinationBranchId,
        vehicleId,
        expectedTransitMinutes,
        notes,
      } = req.body;

      const resolvedSourceBranchId = sourceBranchId || req.user.assignedBranchId;

      if (!garmentStyle || !garmentColor || !resolvedSourceBranchId || !destinationBranchId || !vehicleId) {
        return res.status(400).json({
          error: 'Garment style, color, source branch, destination branch, and vehicle are required.',
        });
      }

      if (resolvedSourceBranchId === destinationBranchId) {
        return res.status(400).json({
          error: 'Source branch and destination branch must be different.',
        });
      }

      const parsedSizes = sizeBreakdown && typeof sizeBreakdown === 'object' ? sizeBreakdown : { Total: Number(dispatchedQty) || 0 };
      const computedTotal =
        Number(dispatchedQty) ||
        Object.values(parsedSizes).reduce((sum, val) => sum + (Number(val) || 0), 0);

      if (computedTotal <= 0) {
        return res.status(400).json({ error: 'Dispatched piece count must be greater than 0.' });
      }

      const transferCode = await generateNextTransferCode();
      const qrPassHash = generateConsignmentHash({
        transferCode,
        sourceBranchId: resolvedSourceBranchId,
        destinationBranchId,
        dispatchedQty: computedTotal,
        vehicleId,
      });

      const created = await prisma.transferConsignment.create({
        data: {
          transferCode,
          qrPassHash,
          garmentStyle: garmentStyle.trim(),
          garmentColor: garmentColor.trim(),
          sizeBreakdown: parsedSizes,
          dispatchedQty: computedTotal,
          sourceBranchId: resolvedSourceBranchId,
          destinationBranchId,
          vehicleId,
          dispatchedById: req.user.id,
          expectedTransitMinutes: Number(expectedTransitMinutes) || 180,
          notes: notes || null,
          status: 'CREATED',
        },
        include: {
          sourceBranch: true,
          destinationBranch: true,
          vehicle: true,
          dispatchedBy: { select: { id: true, fullName: true, username: true } },
        },
      });

      const qrDataUrl = await generateQrDataUrl(created);
      const qrPayload = buildQrPayload(created);

      res.status(201).json({
        ...created,
        qrDataUrl,
        qrPayload,
      });
    } catch (err) {
      console.error('Error creating transfer consignment:', err);
      res.status(500).json({ error: err.message || 'Failed to create dispatch consignment.' });
    }
  }
);

/**
 * GET /api/transfers/:id/pass
 * Returns full Master Transfer QR Gate Pass details + 203 DPI QR code image
 */
router.get('/:id/pass', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const consignment = await prisma.transferConsignment.findFirst({
      where: {
        OR: [{ id }, { transferCode: id }, { qrPassHash: id }],
      },
      include: {
        sourceBranch: true,
        destinationBranch: true,
        vehicle: true,
        dispatchedBy: { select: { id: true, fullName: true, username: true, role: true } },
        gateOutBy: { select: { id: true, fullName: true, username: true, role: true } },
        receivedBy: { select: { id: true, fullName: true, username: true, role: true } },
        discrepancy: true,
        scanLogs: {
          orderBy: { scannedAt: 'asc' },
          include: { scannedBy: { select: { id: true, fullName: true, role: true } } },
        },
      },
    });

    if (!consignment) {
      return res.status(404).json({ error: 'Transfer consignment not found.' });
    }

    const qrDataUrl = await generateQrDataUrl(consignment);
    const qrPayload = buildQrPayload(consignment);

    res.json({
      ...consignment,
      qrDataUrl,
      qrPayload,
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to generate Master QR Gate Pass.' });
  }
});

module.exports = router;
