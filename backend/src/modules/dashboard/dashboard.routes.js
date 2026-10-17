const express = require('express');
const prisma = require('../../config/db');
const { authenticateToken } = require('../../middleware/auth');

const router = express.Router();

/**
 * GET /api/dashboard/overview
 * FR6 & FR7: Real-time KPI summary, overdue transit alerts, and branch transfer analytics
 */
router.get('/overview', authenticateToken, async (req, res) => {
  try {
    const transfers = await prisma.transferConsignment.findMany({
      include: {
        sourceBranch: true,
        destinationBranch: true,
        vehicle: true,
        discrepancy: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    const openDiscrepanciesCount = await prisma.discrepancyLog.count({
      where: { isResolved: false },
    });

    const now = Date.now();
    const inTransitList = transfers.filter((t) => t.status === 'IN_TRANSIT');
    const overdueShipments = inTransitList.filter((t) => {
      if (!t.dispatchTimestamp) return false;
      const elapsedMinutes = (now - new Date(t.dispatchTimestamp).getTime()) / 60000;
      return elapsedMinutes > (t.expectedTransitMinutes || 180);
    });

    const totalDispatchedPieces = transfers.reduce((sum, t) => sum + t.dispatchedQty, 0);
    const inTransitPieces = inTransitList.reduce((sum, t) => sum + t.dispatchedQty, 0);
    const totalShortagePieces = transfers.reduce((sum, t) => {
      if (t.discrepancy && !t.discrepancy.isResolved && t.discrepancy.shortageCount > 0) {
        return sum + t.discrepancy.shortageCount;
      }
      return sum;
    }, 0);

    // Group by branch for Recharts visualization
    const branchStatsMap = {};
    for (const t of transfers) {
      const srcName = t.sourceBranch.branchName.replace('Trendy ', '');
      const dstName = t.destinationBranch.branchName.replace('Trendy ', '');

      if (!branchStatsMap[srcName]) {
        branchStatsMap[srcName] = { branch: srcName, dispatchedPcs: 0, receivedPcs: 0, shipments: 0 };
      }
      if (!branchStatsMap[dstName]) {
        branchStatsMap[dstName] = { branch: dstName, dispatchedPcs: 0, receivedPcs: 0, shipments: 0 };
      }

      branchStatsMap[srcName].dispatchedPcs += t.dispatchedQty;
      branchStatsMap[srcName].shipments += 1;
      if (t.receivedQty !== null) {
        branchStatsMap[dstName].receivedPcs += t.receivedQty;
      }
    }

    const statusBreakdown = [
      { name: 'Awaiting Gate Exit', value: transfers.filter((t) => t.status === 'CREATED').length, status: 'CREATED' },
      { name: 'In-Transit', value: inTransitList.length, status: 'IN_TRANSIT' },
      { name: 'Received (Verified)', value: transfers.filter((t) => t.status === 'RECEIVED').length, status: 'RECEIVED' },
      { name: 'Discrepancy Alert', value: transfers.filter((t) => t.status === 'DISCREPANCY').length, status: 'DISCREPANCY' },
      { name: 'Resolved', value: transfers.filter((t) => t.status === 'RESOLVED').length, status: 'RESOLVED' },
    ];

    const recentScans = await prisma.scanAuditLog.findMany({
      take: 12,
      orderBy: { scannedAt: 'desc' },
      include: {
        transfer: {
          select: {
            transferCode: true,
            garmentStyle: true,
            sourceBranch: { select: { branchName: true } },
            destinationBranch: { select: { branchName: true } },
          },
        },
        scannedBy: {
          select: { fullName: true, role: true },
        },
      },
    });

    res.json({
      kpis: {
        totalConsignments: transfers.length,
        activeInTransitVehicles: inTransitList.length,
        inTransitPieces,
        totalDispatchedPieces,
        openDiscrepanciesCount,
        totalShortagePieces,
        overdueCount: overdueShipments.length,
      },
      overdueShipments: overdueShipments.map((t) => ({
        id: t.id,
        transferCode: t.transferCode,
        garmentStyle: t.garmentStyle,
        dispatchedQty: t.dispatchedQty,
        sourceBranch: t.sourceBranch.branchName,
        destinationBranch: t.destinationBranch.branchName,
        vehicleReg: t.vehicle.registrationNo,
        driverName: t.vehicle.driverName,
        driverPhone: t.vehicle.driverPhone,
        dispatchTimestamp: t.dispatchTimestamp,
        expectedTransitMinutes: t.expectedTransitMinutes,
        elapsedMinutes: Math.round((now - new Date(t.dispatchTimestamp).getTime()) / 60000),
      })),
      branchChartData: Object.values(branchStatsMap),
      statusBreakdown,
      recentScans,
    });
  } catch (err) {
    console.error('Dashboard overview error:', err);
    res.status(500).json({ error: 'Failed to load dashboard metrics.' });
  }
});

module.exports = router;
