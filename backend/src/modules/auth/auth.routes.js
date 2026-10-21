const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const prisma = require('../../config/db');
const { JWT_SECRET, authenticateToken, authorizeRoles } = require('../../middleware/auth');

const router = express.Router();

/**
 * POST /api/auth/login
 * Authenticates user credentials with bcrypt (SR2) and issues JWT token (SR1)
 */
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ error: 'Username/email and password are required.' });
    }

    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { username: username.trim() },
          { email: username.trim().toLowerCase() },
        ],
        isActive: true,
      },
      include: {
        assignedBranch: true,
      },
    });

    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials or inactive account.' });
    }

    const passwordValid = await bcrypt.compare(password, user.passwordHash);
    if (!passwordValid) {
      return res.status(401).json({ error: 'Invalid credentials.' });
    }

    const payload = {
      id: user.id,
      username: user.username,
      email: user.email,
      fullName: user.fullName,
      role: user.role,
      assignedBranchId: user.assignedBranchId,
      branchName: user.assignedBranch?.branchName,
      branchType: user.assignedBranch?.branchType,
    };

    const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '12h' });

    res.json({
      token,
      user: payload,
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Internal server error during login.' });
  }
});

/**
 * GET /api/auth/me
 */
router.get('/me', authenticateToken, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      include: { assignedBranch: true },
    });
    if (!user) {
      return res.status(404).json({ error: 'User not found.' });
    }
    res.json({
      id: user.id,
      username: user.username,
      email: user.email,
      fullName: user.fullName,
      role: user.role,
      assignedBranchId: user.assignedBranchId,
      branchName: user.assignedBranch?.branchName,
      branchType: user.assignedBranch?.branchType,
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch current user profile.' });
  }
});

/**
 * GET /api/auth/branches
 * Accessible to all authenticated users to select source/destination plants
 */
router.get('/branches', authenticateToken, async (req, res) => {
  try {
    const branches = await prisma.branch.findMany({
      orderBy: { branchCode: 'asc' },
    });
    res.json(branches);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch branches.' });
  }
});

/**
 * POST /api/auth/branches (Admin Only)
 */
router.post('/branches', authenticateToken, authorizeRoles('SYSTEM_ADMIN'), async (req, res) => {
  try {
    const { branchCode, branchName, branchType, locationAddress } = req.body;
    if (!branchCode || !branchName || !branchType || !locationAddress) {
      return res.status(400).json({ error: 'All branch fields are required.' });
    }
    const branch = await prisma.branch.create({
      data: { branchCode, branchName, branchType, locationAddress },
    });
    res.status(201).json(branch);
  } catch (err) {
    res.status(400).json({ error: err.message || 'Failed to create branch.' });
  }
});

/**
 * GET /api/auth/vehicles
 * Accessible to dispatchers and management
 */
router.get('/vehicles', authenticateToken, async (req, res) => {
  try {
    const vehicles = await prisma.vehicle.findMany({
      orderBy: { registrationNo: 'asc' },
    });
    res.json(vehicles);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch vehicles.' });
  }
});

/**
 * GET /api/auth/vehicles/available
 * Fleet Query API:
 * - If branchId query param is provided: returns { branchId, inYard, inbound }
 * - Otherwise: returns array of active IN_YARD vehicles
 */
router.get('/vehicles/available', authenticateToken, async (req, res) => {
  try {
    const branchId = req.query.branchId;

    if (branchId) {
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
            select: { id: true, transferCode: true, gateInTimestamp: true, receivedTimestamp: true },
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
            include: { sourceBranch: true, destinationBranch: true },
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
          const elapsed = transfer.dispatchTimestamp
            ? Math.floor((Date.now() - new Date(transfer.dispatchTimestamp).getTime()) / 60000)
            : 0;
          const eta = Math.max(5, (transfer.expectedTransitMinutes || 120) - elapsed);
          return {
            id: v.id,
            registrationNo: v.registrationNo,
            registrationNumber: v.registrationNo,
            driverName: v.driverName,
            driverPhone: v.driverPhone,
            driverNic: v.driverNic,
            vehicleType: v.vehicleType,
            status: v.status,
            originPlant: transfer.sourceBranch?.branchName || 'Origin Facility',
            activeConsignment: {
              id: transfer.id,
              transferCode: transfer.transferCode,
              sourceBranch: transfer.sourceBranch,
              destinationBranch: transfer.destinationBranch,
              dispatchTimestamp: transfer.dispatchTimestamp,
              expectedTransitMinutes: transfer.expectedTransitMinutes,
              etaMinutes: eta,
              etaFormatted: `Expected arrival in ~${eta} mins (${transfer.transferCode})`,
            },
          };
        });

      return res.json({
        branchId,
        inYard,
        inbound,
      });
    }

    const vehicles = await prisma.vehicle.findMany({
      where: {
        isActive: true,
        status: 'IN_YARD',
      },
      include: {
        currentBranch: true,
      },
      orderBy: { registrationNo: 'asc' },
    });

    res.json(vehicles.map((v) => ({ ...v, registrationNumber: v.registrationNo })));
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch available vehicles.' });
  }
});

/**
 * POST /api/auth/vehicles (Admin & Dispatch Officer)
 */
router.post('/vehicles', authenticateToken, authorizeRoles('SYSTEM_ADMIN', 'DISPATCH_OFFICER'), async (req, res) => {
  try {
    const { registrationNo, driverName, driverNic, driverPhone, vehicleType } = req.body;
    if (!registrationNo || !driverName || !driverNic || !driverPhone) {
      return res.status(400).json({ error: 'Registration number and driver details are required.' });
    }
    const vehicle = await prisma.vehicle.create({
      data: {
        registrationNo: registrationNo.toUpperCase().trim(),
        driverName,
        driverNic,
        driverPhone,
        vehicleType: vehicleType || 'Lorry',
      },
    });
    res.status(201).json(vehicle);
  } catch (err) {
    res.status(400).json({ error: err.message || 'Failed to register vehicle.' });
  }
});

/**
 * GET /api/auth/users (System Admin Only)
 */
router.get('/users', authenticateToken, authorizeRoles('SYSTEM_ADMIN'), async (req, res) => {
  try {
    const users = await prisma.user.findMany({
      include: { assignedBranch: true },
      orderBy: { createdAt: 'asc' },
    });
    res.json(
      users.map((u) => ({
        id: u.id,
        username: u.username,
        email: u.email,
        fullName: u.fullName,
        role: u.role,
        assignedBranchId: u.assignedBranchId,
        assignedBranch: u.assignedBranch,
        isActive: u.isActive,
        createdAt: u.createdAt,
      }))
    );
  } catch (err) {
    res.status(500).json({ error: 'Failed to list users.' });
  }
});

/**
 * POST /api/auth/users (System Admin Only - SR2 bcrypt cost factor 10)
 */
router.post('/users', authenticateToken, authorizeRoles('SYSTEM_ADMIN'), async (req, res) => {
  try {
    const { username, email, fullName, password, role, assignedBranchId } = req.body;
    if (!username || !email || !fullName || !password || !role || !assignedBranchId) {
      return res.status(400).json({ error: 'All user fields are required.' });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const created = await prisma.user.create({
      data: {
        username: username.trim(),
        email: email.trim().toLowerCase(),
        fullName,
        passwordHash,
        role,
        assignedBranchId,
      },
      include: { assignedBranch: true },
    });

    res.status(201).json({
      id: created.id,
      username: created.username,
      email: created.email,
      fullName: created.fullName,
      role: created.role,
      assignedBranch: created.assignedBranch,
    });
  } catch (err) {
    res.status(400).json({ error: err.message || 'Failed to create user.' });
  }
});

module.exports = router;
