const express = require('express');
const prisma = require('../../config/db');
const { authenticateToken, authorizeRoles } = require('../../middleware/auth');

const router = express.Router();

/**
 * GET /api/discrepancies
 * Lists all discrepancy logs with full chain-of-custody triangulation data:
 * Dispatch Officer -> Gate Security (Exit) -> Vehicle/Driver -> Receiving Officer
 */
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { resolutionStatus } = req.query;
    const where = {};
    if (resolutionStatus) {
      where.resolutionStatus = resolutionStatus;
    }

    const discrepancies = await prisma.discrepancyLog.findMany({
      where,
      include: {
        reportedBy: { select: { id: true, fullName: true, username: true, role: true } },
        resolvedBy: { select: { id: true, fullName: true, username: true, role: true } },
        transfer: {
          include: {
            sourceBranch: true,
            destinationBranch: true,
            vehicle: true,
            dispatchedBy: { select: { id: true, fullName: true, username: true, role: true } },
            gateOutBy: { select: { id: true, fullName: true, username: true, role: true } },
            receivedBy: { select: { id: true, fullName: true, username: true, role: true } },
          },
        },
      },
      orderBy: { timestamp: 'desc' },
    });

    res.json(discrepancies);
  } catch (err) {
    console.error('Error fetching discrepancies:', err);
    res.status(500).json({ error: 'Failed to fetch discrepancy logs.' });
  }
});

/**
 * PATCH /api/discrepancies/:id/resolve
 * Logistics Manager / Admin updates resolution status (OPEN -> INVESTIGATING -> RESOLVED)
 */
router.patch(
  '/:id/resolve',
  authenticateToken,
  authorizeRoles('LOGISTICS_MANAGER', 'SYSTEM_ADMIN'),
  async (req, res) => {
    try {
      const { id } = req.params;
      const { resolutionStatus, comments } = req.body;

      if (!['OPEN', 'INVESTIGATING', 'RESOLVED'].includes(resolutionStatus)) {
        return res.status(400).json({ error: 'Invalid resolutionStatus value.' });
      }

      const isResolved = resolutionStatus === 'RESOLVED';

      const updated = await prisma.discrepancyLog.update({
        where: { id },
        data: {
          resolutionStatus,
          isResolved,
          comments: comments || undefined,
          resolvedById: isResolved ? req.user.id : null,
          resolvedAt: isResolved ? new Date() : null,
        },
        include: {
          reportedBy: { select: { id: true, fullName: true, role: true } },
          resolvedBy: { select: { id: true, fullName: true, role: true } },
          transfer: {
            include: {
              sourceBranch: true,
              destinationBranch: true,
              vehicle: true,
            },
          },
        },
      });

      if (isResolved) {
        await prisma.transferConsignment.update({
          where: { id: updated.transferId },
          data: { status: 'RESOLVED' },
        });
      } else {
        await prisma.transferConsignment.update({
          where: { id: updated.transferId },
          data: { status: 'DISCREPANCY' },
        });
      }

      res.json(updated);
    } catch (err) {
      console.error('Error updating discrepancy resolution:', err);
      res.status(400).json({ error: err.message || 'Failed to update discrepancy status.' });
    }
  }
);

module.exports = router;
