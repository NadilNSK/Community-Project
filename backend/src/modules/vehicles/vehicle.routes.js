const express = require('express');
const prisma = require('../../config/db');
const { authenticateToken, authorizeRoles } = require('../../middleware/auth');

const router = express.Router();

/**
 * Helper to compute ETA in minutes for a consignment in transit
 */
function computeEtaMinutes(dispatchTimestamp, expectedMinutes = 120) {
  if (!dispatchTimestamp) return expectedMinutes;
  const elapsedMinutes = Math.floor((Date.now() - new Date(dispatchTimestamp).getTime()) / 60000);
  const remaining = expectedMinutes - elapsedMinutes;
  return Math.max(5, remaining);
}

/**
 * GET /api/vehicles/available
 * Fleet Query API:
 * 1) inYard: All vehicles where currentBranchId === branchId and status === 'IN_YARD'
 * 2) inbound: All vehicles where status === 'IN_TRANSIT' and an active consignment has destinationBranchId === branchId
 */
router.get('/available', authenticateToken, async (req, res) => {
  try {
    const branchId = req.query.branchId || req.user?.assignedBranchId;

    if (!branchId) {
      return res.status(400).json({ error: 'branchId query parameter is required.' });
    }

    // 1. Fetch vehicles physically parked in this yard and idle
    const inYardVehicles = await prisma.vehicle.findMany({
      where: {
        currentBranchId: branchId,
        status: 'IN_YARD',
        isActive: true,
      },
      include: {
        currentBranch: true,
        transfers: {
          orderBy: { createdAt: 'desc' },
          take: 1,
          select: {
            id: true,
            transferCode: true,
            status: true,
            gateInTimestamp: true,
            receivedTimestamp: true,
          },
        },
      },
      orderBy: { registrationNo: 'asc' },
    });

    const inYard = inYardVehicles.map((v) => {
      const lastTransfer = v.transfers?.[0];
      const checkInTime = lastTransfer?.gateInTimestamp || lastTransfer?.receivedTimestamp || v.updatedAt;
      const formattedCheckIn = checkInTime
        ? new Date(checkInTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        : '08:30 AM';

      return {
        id: v.id,
        registrationNo: v.registrationNo,
        registrationNumber: v.registrationNo,
        driverName: v.driverName,
        driverPhone: v.driverPhone,
        driverNic: v.driverNic,
        vehicleType: v.vehicleType,
        status: v.status,
        currentBranchId: v.currentBranchId,
        currentBranch: v.currentBranch,
        checkedInTime: formattedCheckIn,
        stateDescription: 'Idle / Ready to load',
      };
    });

    // 2. Fetch inbound vehicles: status === 'IN_TRANSIT' with active consignment heading to this branch
    const inTransitVehicles = await prisma.vehicle.findMany({
      where: {
        status: 'IN_TRANSIT',
        isActive: true,
      },
      include: {
        transfers: {
          where: {
            destinationBranchId: branchId,
            status: { in: ['IN_TRANSIT', 'CREATED'] },
          },
          include: {
            sourceBranch: true,
            destinationBranch: true,
          },
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
      orderBy: { registrationNo: 'asc' },
    });

    const inbound = inTransitVehicles
      .filter((v) => v.transfers && v.transfers.length > 0)
      .map((v) => {
        const transfer = v.transfers[0];
        const eta = computeEtaMinutes(transfer.dispatchTimestamp, transfer.expectedTransitMinutes);
        return {
          id: v.id,
          registrationNo: v.registrationNo,
          registrationNumber: v.registrationNo,
          driverName: v.driverName,
          driverPhone: v.driverPhone,
          driverNic: v.driverNic,
          vehicleType: v.vehicleType,
          status: v.status,
          currentBranchId: null,
          originPlant: transfer.sourceBranch?.branchName || 'Origin Facility',
          activeConsignment: {
            id: transfer.id,
            transferCode: transfer.transferCode,
            garmentStyle: transfer.garmentStyle,
            sourceBranch: transfer.sourceBranch,
            destinationBranch: transfer.destinationBranch,
            dispatchTimestamp: transfer.dispatchTimestamp,
            expectedTransitMinutes: transfer.expectedTransitMinutes,
            etaMinutes: eta,
            etaFormatted: `Expected arrival in ~${eta} mins (${transfer.transferCode})`,
          },
        };
      });

    res.json({
      branchId,
      inYard,
      inbound,
    });
  } catch (err) {
    console.error('Error fetching available vehicles:', err);
    res.status(500).json({ error: 'Failed to fetch available vehicles.' });
  }
});

/**
 * GET /api/vehicles
 * Returns all active vehicles
 */
router.get('/', authenticateToken, async (req, res) => {
  try {
    const vehicles = await prisma.vehicle.findMany({
      include: { currentBranch: true },
      orderBy: { registrationNo: 'asc' },
    });
    res.json(vehicles.map((v) => ({ ...v, registrationNumber: v.registrationNo })));
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch vehicles.' });
  }
});

module.exports = router;
