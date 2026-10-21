const express = require('express');
const prisma = require('../../config/db');
const { authenticateToken, authorizeRoles } = require('../../middleware/auth');
const { generateConsignmentHash, buildQrPayload, generateQrDataUrl } = require('../../utils/qrCrypto');

const router = express.Router();

/**
 * Helper to generate human-readable sequential Transfer Gate Pass Code (e.g., GP-2026-0005)
 */
async function generateNextTransferCode() {
  const latest = await prisma.transferConsignment.findFirst({
    where: {
      transferCode: {
        startsWith: 'GP-2026-',
      },
    },
    orderBy: {
      transferCode: 'desc',
    },
  });

  if (latest && latest.transferCode) {
    const match = latest.transferCode.match(/GP-2026-(\d+)/);
    if (match) {
      const nextNum = parseInt(match[1], 10) + 1;
      return `GP-2026-${String(nextNum).padStart(4, '0')}`;
    }
  }

  const count = await prisma.transferConsignment.count();
  return `GP-2026-${String(count + 1).padStart(4, '0')}`;
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

      // Validate vehicle physical location and yard presence
      const vehicle = await prisma.vehicle.findUnique({
        where: { id: vehicleId },
        include: { currentBranch: true },
      });

      if (!vehicle) {
        return res.status(400).json({ error: 'Selected vehicle not found.' });
      }

      if (vehicle.currentBranchId !== resolvedSourceBranchId || vehicle.status !== 'IN_YARD') {
        return res.status(400).json({
          error: `Vehicle ${vehicle.registrationNo} cannot be dispatched. Only vehicles physically inside this yard with status 'IN_YARD' are available for loading (Current Status: ${vehicle.status}, Location: ${vehicle.currentBranch?.branchName || 'In Transit'}).`,
        });
      }

      // Server-side vehicle availability validation — prevent duplicate simultaneous dispatches
      const activeTransferForVehicle = await prisma.transferConsignment.findFirst({
        where: {
          vehicleId,
          status: {
            notIn: ['RECEIVED', 'RESOLVED'],
          },
        },
      });

      if (activeTransferForVehicle) {
        return res.status(400).json({
          error: `Vehicle is currently assigned to active transfer ${activeTransferForVehicle.transferCode}. It will become available once the consignment is received at the destination.`,
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

      // Update vehicle status to LOADING (assigned to new pass, awaiting gate exit)
      await prisma.vehicle.update({
        where: { id: vehicleId },
        data: {
          status: 'LOADING',
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
