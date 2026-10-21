require('dotenv').config();
const bcrypt = require('bcryptjs');
const prisma = require('../src/config/db');
const { generateConsignmentHash } = require('../src/utils/qrCrypto');

async function main() {
  console.log('Seeding Trendy Apparel Inter-Branch Logistics database...');

  await prisma.scanAuditLog.deleteMany();
  await prisma.discrepancyLog.deleteMany();
  await prisma.transferConsignment.deleteMany();
  await prisma.user.deleteMany();
  await prisma.vehicle.deleteMany();
  await prisma.branch.deleteMany();

  // 1. Factory Branches
  const sewingBranch = await prisma.branch.create({
    data: {
      branchCode: 'TR-SEW-01',
      branchName: 'Adhikarigama Sewing Plant',
      branchType: 'SEWING',
      locationAddress: 'Main Industrial Zone, Adhikarigama',
    },
  });

  const washingBranch = await prisma.branch.create({
    data: {
      branchCode: 'TR-WSH-02',
      branchName: 'Kuruwita Washing Plant',
      branchType: 'WASHING',
      locationAddress: 'Export Processing Park, Kuruwita',
    },
  });

  const finishingBranch = await prisma.branch.create({
    data: {
      branchCode: 'TR-FIN-03',
      branchName: 'Avissawella Finishing Hub',
      branchType: 'FINISHING',
      locationAddress: 'Industrial Corridor, Avissawella',
    },
  });

  const embroiderySub = await prisma.branch.create({
    data: {
      branchCode: 'TR-EMB-04',
      branchName: 'Lanka Stitch Embroidery',
      branchType: 'SUBCONTRACTOR',
      locationAddress: 'Apparel Cluster, Maharagama',
    },
  });

  const headOffice = await prisma.branch.create({
    data: {
      branchCode: 'TR-HQ-00',
      branchName: 'Colombo Head Office',
      branchType: 'HEAD_OFFICE',
      locationAddress: 'Colombo 03',
    },
  });

  // 2. Industrial Role Accounts (Default password: password123)
  const passwordHash = await bcrypt.hash('password123', 10);

  const adminUser = await prisma.user.create({
    data: {
      username: 'admin',
      email: 'admin@trendyapparel.lk',
      fullName: 'System Administrator',
      passwordHash,
      role: 'SYSTEM_ADMIN',
      assignedBranchId: headOffice.id,
    },
  });

  const dispatchUser = await prisma.user.create({
    data: {
      username: 'dispatcher',
      email: 'dispatch.sew01@trendyapparel.lk',
      fullName: 'R.M. Karunaratne',
      passwordHash,
      role: 'DISPATCH_OFFICER',
      assignedBranchId: sewingBranch.id,
    },
  });

  const securityUser = await prisma.user.create({
    data: {
      username: 'security',
      email: 'gate.sew01@trendyapparel.lk',
      fullName: 'S.P. Wickramasinghe',
      passwordHash,
      role: 'GATE_SECURITY',
      assignedBranchId: sewingBranch.id,
    },
  });

  const receivingUser = await prisma.user.create({
    data: {
      username: 'receiver',
      email: 'receiving.wsh02@trendyapparel.lk',
      fullName: 'A.K. Dissanayake',
      passwordHash,
      role: 'RECEIVING_OFFICER',
      assignedBranchId: washingBranch.id,
    },
  });

  const managerUser = await prisma.user.create({
    data: {
      username: 'manager',
      email: 'logistics@trendyapparel.lk',
      fullName: 'Samanthi Samarawickrama',
      passwordHash,
      role: 'LOGISTICS_MANAGER',
      assignedBranchId: headOffice.id,
    },
  });

  // 3. Fleet Vehicles
  const lorry1 = await prisma.vehicle.create({
    data: {
      registrationNo: 'WP LB-4582',
      driverName: 'Sunil Perera',
      driverNic: '198424501234',
      driverPhone: '0774123980',
      vehicleType: '16ft Container Lorry',
      currentBranchId: sewingBranch.id,
      status: 'IN_YARD',
    },
  });

  const lorry2 = await prisma.vehicle.create({
    data: {
      registrationNo: 'SG LD-9910',
      driverName: 'Chaminda Bandara',
      driverNic: '199011204589',
      driverPhone: '0718456321',
      vehicleType: '14.5ft Box Lorry',
      currentBranchId: null,
      status: 'IN_TRANSIT',
    },
  });

  const van1 = await prisma.vehicle.create({
    data: {
      registrationNo: 'WP PE-3304',
      driverName: 'Kasun Jayawardena',
      driverNic: '199330108871',
      driverPhone: '0769982110',
      vehicleType: 'High-Roof Delivery Van',
      currentBranchId: sewingBranch.id,
      status: 'IN_YARD',
    },
  });

  const lorry3 = await prisma.vehicle.create({
    data: {
      registrationNo: 'WP NC-7741',
      driverName: 'Nimal Rajapaksa',
      driverNic: '198730108912',
      driverPhone: '0762349811',
      vehicleType: 'Covered Alu-Van',
      currentBranchId: washingBranch.id,
      status: 'IN_YARD',
    },
  });

  const now = Date.now();

  // 4. Sample Consignments
  const code1 = 'GP-2026-0001';
  const hash1 = generateConsignmentHash({
    transferCode: code1,
    sourceBranchId: sewingBranch.id,
    destinationBranchId: washingBranch.id,
    dispatchedQty: 1500,
    vehicleId: lorry1.id,
  });

  const transfer1 = await prisma.transferConsignment.create({
    data: {
      transferCode: code1,
      qrPassHash: hash1,
      garmentStyle: 'TR-DENIM-JKT-402',
      garmentColor: 'Indigo Raw',
      sizeBreakdown: { S: 300, M: 500, L: 450, XL: 250 },
      dispatchedQty: 1500,
      receivedQty: 1500,
      status: 'RECEIVED',
      expectedTransitMinutes: 120,
      dispatchTimestamp: new Date(now - 5 * 3600 * 1000),
      gateInTimestamp: new Date(now - 3.2 * 3600 * 1000),
      receivedTimestamp: new Date(now - 3 * 3600 * 1000),
      notes: 'PO #UK-882 • Seal #SL-90412',
      sourceBranchId: sewingBranch.id,
      destinationBranchId: washingBranch.id,
      vehicleId: lorry1.id,
      dispatchedById: dispatchUser.id,
      gateOutById: securityUser.id,
      receivedById: receivingUser.id,
    },
  });

  const code2 = 'TR-2026-1002';
  const hash2 = generateConsignmentHash({
    transferCode: code2,
    sourceBranchId: washingBranch.id,
    destinationBranchId: sewingBranch.id,
    dispatchedQty: 2200,
    vehicleId: lorry2.id,
  });

  await prisma.transferConsignment.create({
    data: {
      transferCode: code2,
      qrPassHash: hash2,
      garmentStyle: 'TR-CHINO-PNT-118',
      garmentColor: 'Olive Washed',
      sizeBreakdown: { S: 400, M: 800, L: 600, XL: 400 },
      dispatchedQty: 2200,
      status: 'IN_TRANSIT',
      expectedTransitMinutes: 90,
      dispatchTimestamp: new Date(now - 65 * 60 * 1000),
      notes: 'Seal #SL-90455',
      sourceBranchId: washingBranch.id,
      destinationBranchId: sewingBranch.id,
      vehicleId: lorry2.id,
      dispatchedById: dispatchUser.id,
      gateOutById: securityUser.id,
    },
  });

  const code3 = 'GP-2026-0003';
  const hash3 = generateConsignmentHash({
    transferCode: code3,
    sourceBranchId: sewingBranch.id,
    destinationBranchId: embroiderySub.id,
    dispatchedQty: 850,
    vehicleId: van1.id,
  });

  await prisma.transferConsignment.create({
    data: {
      transferCode: code3,
      qrPassHash: hash3,
      garmentStyle: 'TR-POLO-EMB-905',
      garmentColor: 'Navy Blue',
      sizeBreakdown: { S: 150, M: 300, L: 250, XL: 150 },
      dispatchedQty: 850,
      receivedQty: 850,
      status: 'RECEIVED',
      expectedTransitMinutes: 90,
      dispatchTimestamp: new Date(now - 165 * 60 * 1000),
      gateInTimestamp: new Date(now - 75 * 60 * 1000),
      receivedTimestamp: new Date(now - 70 * 60 * 1000),
      notes: 'Chest logo panel batch',
      sourceBranchId: sewingBranch.id,
      destinationBranchId: embroiderySub.id,
      vehicleId: van1.id,
      dispatchedById: dispatchUser.id,
      gateOutById: securityUser.id,
      receivedById: receivingUser.id,
    },
  });

  const code5 = 'GP-2026-0005';
  const hash5 = generateConsignmentHash({
    transferCode: code5,
    sourceBranchId: washingBranch.id,
    destinationBranchId: finishingBranch.id,
    dispatchedQty: 1200,
    vehicleId: lorry2.id,
  });

  await prisma.transferConsignment.create({
    data: {
      transferCode: code5,
      qrPassHash: hash5,
      garmentStyle: 'TR-HOODIE-304',
      garmentColor: 'Heather Grey',
      sizeBreakdown: { S: 200, M: 400, L: 400, XL: 200 },
      dispatchedQty: 1200,
      receivedQty: 1200,
      status: 'RECEIVED',
      expectedTransitMinutes: 120,
      dispatchTimestamp: new Date(now - 8 * 3600 * 1000),
      gateInTimestamp: new Date(now - 6.3 * 3600 * 1000),
      receivedTimestamp: new Date(now - 6 * 3600 * 1000),
      notes: 'Verified complete',
      sourceBranchId: washingBranch.id,
      destinationBranchId: finishingBranch.id,
      vehicleId: lorry2.id,
      dispatchedById: dispatchUser.id,
      gateOutById: securityUser.id,
      receivedById: receivingUser.id,
    },
  });

  console.log('Seed completed.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
