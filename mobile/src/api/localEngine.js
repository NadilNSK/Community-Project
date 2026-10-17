import AsyncStorage from '@react-native-async-storage/async-storage';

const LOCAL_DB_KEY = '@trendy_standalone_db_v1';
const USER_KEY = '@trendy_auth_user';

const INITIAL_BRANCHES = [
  {
    id: 'br-sew-01',
    branchCode: 'TR-SEW-01',
    branchName: 'Adhikarigama Sewing Plant',
    branchType: 'SEWING',
    locationAddress: 'Main Industrial Zone, Adhikarigama',
  },
  {
    id: 'br-wsh-02',
    branchCode: 'TR-WSH-02',
    branchName: 'Kuruwita Washing Plant',
    branchType: 'WASHING',
    locationAddress: 'Export Processing Park, Kuruwita',
  },
  {
    id: 'br-fin-03',
    branchCode: 'TR-FIN-03',
    branchName: 'Avissawella Finishing Hub',
    branchType: 'FINISHING',
    locationAddress: 'Industrial Corridor, Avissawella',
  },
  {
    id: 'br-emb-04',
    branchCode: 'TR-EMB-04',
    branchName: 'Lanka Stitch Embroidery',
    branchType: 'SUBCONTRACTOR',
    locationAddress: 'Apparel Cluster, Maharagama',
  },
  {
    id: 'br-hq-00',
    branchCode: 'TR-HQ-00',
    branchName: 'Colombo Head Office',
    branchType: 'HEAD_OFFICE',
    locationAddress: 'Colombo 03',
  },
];

const INITIAL_USERS = [
  {
    id: 'usr-admin',
    username: 'admin',
    email: 'admin@trendyapparel.lk',
    fullName: 'System Administrator',
    password: 'password123',
    role: 'SYSTEM_ADMIN',
    assignedBranchId: 'br-hq-00',
    isActive: true,
  },
  {
    id: 'usr-dispatch',
    username: 'dispatcher',
    email: 'dispatch.sew01@trendyapparel.lk',
    fullName: 'R.M. Karunaratne',
    password: 'password123',
    role: 'DISPATCH_OFFICER',
    assignedBranchId: 'br-sew-01',
    isActive: true,
  },
  {
    id: 'usr-security',
    username: 'security',
    email: 'gate.sew01@trendyapparel.lk',
    fullName: 'S.P. Wickramasinghe',
    password: 'password123',
    role: 'GATE_SECURITY',
    assignedBranchId: 'br-sew-01',
    isActive: true,
  },
  {
    id: 'usr-receiver',
    username: 'receiver',
    email: 'receiving.wsh02@trendyapparel.lk',
    fullName: 'A.K. Dissanayake',
    password: 'password123',
    role: 'RECEIVING_OFFICER',
    assignedBranchId: 'br-wsh-02',
    isActive: true,
  },
  {
    id: 'usr-manager',
    username: 'manager',
    email: 'logistics@trendyapparel.lk',
    fullName: 'Samanthi Samarawickrama',
    password: 'password123',
    role: 'LOGISTICS_MANAGER',
    assignedBranchId: 'br-hq-00',
    isActive: true,
  },
];

const INITIAL_VEHICLES = [
  {
    id: 'veh-01',
    registrationNo: 'WP LB-4582',
    driverName: 'Sunil Perera',
    driverNic: '198424501234',
    driverPhone: '0774123980',
    vehicleType: '16ft Container Lorry',
  },
  {
    id: 'veh-02',
    registrationNo: 'SG LD-9910',
    driverName: 'Chaminda Bandara',
    driverNic: '199011204589',
    driverPhone: '0718456321',
    vehicleType: '14.5ft Box Lorry',
  },
  {
    id: 'veh-03',
    registrationNo: 'WP NC-7741',
    driverName: 'Nimal Rajapaksa',
    driverNic: '198730108912',
    driverPhone: '0762349811',
    vehicleType: 'Covered Alu-Van',
  },
];

function makeSimpleHash(str) {
  let h1 = 0xdeadbeef ^ str.length;
  let h2 = 0x41c6ce57 ^ str.length;
  for (let i = 0, ch; i < str.length; i++) {
    ch = str.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return (h2 >>> 0).toString(16).padStart(8, '0') + (h1 >>> 0).toString(16).padStart(8, '0');
}

function buildInitialConsignments() {
  const now = Date.now();
  return [
    {
      id: 'tr-1001',
      transferCode: 'TR-2026-1001',
      garmentStyle: 'DENIM-CARGO-JOGGER-V4',
      garmentColor: 'Vintage Indigo Wash',
      sizeBreakdown: { S: 120, M: 180, L: 140, XL: 60 },
      dispatchedQty: 500,
      receivedQty: 500,
      status: 'RECEIVED',
      qrPassHash: 'a94f2810c83b19e47f023c1a8b9d3402',
      qrDataUrl: 'https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=TR-2026-1001',
      sourceBranchId: 'br-sew-01',
      destinationBranchId: 'br-wsh-02',
      vehicleId: 'veh-01',
      createdById: 'usr-dispatch',
      expectedTransitMinutes: 120,
      createdAt: new Date(now - 6 * 3600 * 1000).toISOString(),
      dispatchedAt: new Date(now - 5.5 * 3600 * 1000).toISOString(),
      receivedAt: new Date(now - 3.5 * 3600 * 1000).toISOString(),
      scanLogs: [
        {
          id: 'sc-1',
          scanType: 'SOURCE_OUT',
          scannedAt: new Date(now - 5.5 * 3600 * 1000).toISOString(),
          scannedById: 'usr-security',
          branchId: 'br-sew-01',
          comments: 'Exit seal verified at Adhikarigama Main Gate',
        },
        {
          id: 'sc-2',
          scanType: 'INTAKE_VERIFICATION',
          scannedAt: new Date(now - 3.5 * 3600 * 1000).toISOString(),
          scannedById: 'usr-receiver',
          branchId: 'br-wsh-02',
          recordedQty: 500,
          comments: 'Full batch 500 pcs verified at Kuruwita Washing Dock',
        },
      ],
    },
    {
      id: 'tr-1002',
      transferCode: 'TR-2026-1002',
      garmentStyle: 'POLO-PIQUE-EXPORT-22',
      garmentColor: 'Navy Heather',
      sizeBreakdown: { S: 80, M: 150, L: 120, XL: 50 },
      dispatchedQty: 400,
      receivedQty: 385,
      status: 'DISCREPANCY',
      qrPassHash: 'b82c9104d73e20a19f841d2e7c6a1190',
      qrDataUrl: 'https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=TR-2026-1002',
      sourceBranchId: 'br-wsh-02',
      destinationBranchId: 'br-fin-03',
      vehicleId: 'veh-02',
      createdById: 'usr-dispatch',
      expectedTransitMinutes: 90,
      createdAt: new Date(now - 12 * 3600 * 1000).toISOString(),
      dispatchedAt: new Date(now - 11.5 * 3600 * 1000).toISOString(),
      receivedAt: new Date(now - 9 * 3600 * 1000).toISOString(),
      scanLogs: [
        {
          id: 'sc-3',
          scanType: 'SOURCE_OUT',
          scannedAt: new Date(now - 11.5 * 3600 * 1000).toISOString(),
          scannedById: 'usr-security',
          branchId: 'br-wsh-02',
          comments: 'Dispatched from Kuruwita Gate B',
        },
        {
          id: 'sc-4',
          scanType: 'INTAKE_VERIFICATION',
          scannedAt: new Date(now - 9 * 3600 * 1000).toISOString(),
          scannedById: 'usr-receiver',
          branchId: 'br-fin-03',
          recordedQty: 385,
          comments: 'Bundle #4 missing 15 pcs Size M on arrival',
        },
      ],
    },
    {
      id: 'tr-1003',
      transferCode: 'TR-2026-1003',
      garmentStyle: 'FLEECE-HOODIE-AW26',
      garmentColor: 'Charcoal Marl',
      sizeBreakdown: { S: 100, M: 200, L: 180, XL: 120 },
      dispatchedQty: 600,
      receivedQty: null,
      status: 'IN_TRANSIT',
      qrPassHash: 'c71d8293e64f10b28e952c3f6b5a2281',
      qrDataUrl: 'https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=TR-2026-1003',
      sourceBranchId: 'br-sew-01',
      destinationBranchId: 'br-wsh-02',
      vehicleId: 'veh-01',
      createdById: 'usr-dispatch',
      expectedTransitMinutes: 120,
      createdAt: new Date(now - 1.5 * 3600 * 1000).toISOString(),
      dispatchedAt: new Date(now - 1 * 3600 * 1000).toISOString(),
      receivedAt: null,
      scanLogs: [
        {
          id: 'sc-5',
          scanType: 'SOURCE_OUT',
          scannedAt: new Date(now - 1 * 3600 * 1000).toISOString(),
          scannedById: 'usr-security',
          branchId: 'br-sew-01',
          comments: 'Cleared Adhikarigama Security Checkpoint',
        },
      ],
    },
    {
      id: 'tr-1004',
      transferCode: 'TR-2026-1004',
      garmentStyle: 'LINEN-RESORT-SHIRT-09',
      garmentColor: 'Sandstone Beige',
      sizeBreakdown: { S: 60, M: 120, L: 90, XL: 50 },
      dispatchedQty: 320,
      receivedQty: null,
      status: 'CREATED',
      qrPassHash: 'd60e7384f55a21c39f063d4a5c4b3372',
      qrDataUrl: 'https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=TR-2026-1004',
      sourceBranchId: 'br-sew-01',
      destinationBranchId: 'br-emb-04',
      vehicleId: 'veh-03',
      createdById: 'usr-dispatch',
      expectedTransitMinutes: 150,
      createdAt: new Date(now - 0.5 * 3600 * 1000).toISOString(),
      dispatchedAt: null,
      receivedAt: null,
      scanLogs: [],
    },
  ];
}

function buildInitialDiscrepancies() {
  const now = Date.now();
  return [
    {
      id: 'dsc-01',
      consignmentId: 'tr-1002',
      dispatchedQty: 400,
      receivedQty: 385,
      varianceQty: -15,
      resolutionStatus: 'OPEN',
      reportedById: 'usr-receiver',
      comments: 'Bundle #4 missing 15 pcs Size M on arrival at Avissawella Finishing Hub.',
      createdAt: new Date(now - 9 * 3600 * 1000).toISOString(),
      resolvedAt: null,
    },
  ];
}

async function getDb() {
  try {
    const raw = await AsyncStorage.getItem(LOCAL_DB_KEY);
    if (raw) {
      return JSON.parse(raw);
    }
  } catch {
    // ignore
  }
  const initial = {
    branches: INITIAL_BRANCHES,
    users: INITIAL_USERS,
    vehicles: INITIAL_VEHICLES,
    consignments: buildInitialConsignments(),
    discrepancies: buildInitialDiscrepancies(),
  };
  await AsyncStorage.setItem(LOCAL_DB_KEY, JSON.stringify(initial));
  return initial;
}

async function saveDb(db) {
  await AsyncStorage.setItem(LOCAL_DB_KEY, JSON.stringify(db));
}

function hydrateConsignment(c, db) {
  const sourceBranch = db.branches.find((b) => b.id === c.sourceBranchId) || db.branches[0];
  const destinationBranch =
    db.branches.find((b) => b.id === c.destinationBranchId) || db.branches[1];
  const vehicle = db.vehicles.find((v) => v.id === c.vehicleId) || db.vehicles[0];
  const createdBy = db.users.find((u) => u.id === c.createdById) || db.users[1];

  const scanLogs = (c.scanLogs || []).map((log) => ({
    ...log,
    scannedBy: db.users.find((u) => u.id === log.scannedById) || db.users[2],
    branch: db.branches.find((b) => b.id === log.branchId) || sourceBranch,
  }));

  return {
    ...c,
    sourceBranch,
    destinationBranch,
    vehicle,
    createdBy,
    scanLogs,
  };
}

export async function handleLocalApiRequest(path, options = {}) {
  const method = (options.method || 'GET').toUpperCase();
  const body = options.body ? JSON.parse(options.body) : {};
  const db = await getDb();

  const rawCurrentUser = await AsyncStorage.getItem(USER_KEY);
  const currentUser = rawCurrentUser ? JSON.parse(rawCurrentUser) : db.users[0];

  // 1. POST /api/auth/login
  if (path === '/api/auth/login' && method === 'POST') {
    const uname = (body.username || '').trim().toLowerCase();
    const user = db.users.find(
      (u) => u.username.toLowerCase() === uname || u.email.toLowerCase() === uname
    );
    if (!user || user.password !== body.password) {
      throw new Error('Invalid credentials.');
    }
    const branch = db.branches.find((b) => b.id === user.assignedBranchId);
    const payload = {
      id: user.id,
      username: user.username,
      email: user.email,
      fullName: user.fullName,
      role: user.role,
      assignedBranchId: user.assignedBranchId,
      branchName: branch?.branchName || 'Colombo Head Office',
      branchType: branch?.branchType || 'HEAD_OFFICE',
    };
    return {
      token: `local-jwt-${user.id}-${Date.now()}`,
      user: payload,
    };
  }

  // 2. GET /api/auth/branches & POST /api/auth/branches
  if (path === '/api/auth/branches') {
    if (method === 'GET') {
      return db.branches;
    }
    if (method === 'POST') {
      const newBranch = {
        id: `br-${Date.now()}`,
        branchCode: body.branchCode,
        branchName: body.branchName,
        branchType: body.branchType || 'SEWING',
        locationAddress: body.locationAddress,
      };
      db.branches.push(newBranch);
      await saveDb(db);
      return newBranch;
    }
  }

  // 3. GET /api/auth/vehicles & POST /api/auth/vehicles
  if (path === '/api/auth/vehicles') {
    if (method === 'GET') {
      return db.vehicles;
    }
    if (method === 'POST') {
      const newVehicle = {
        id: `veh-${Date.now()}`,
        registrationNo: body.registrationNo,
        driverName: body.driverName,
        driverNic: body.driverNic || '199000000000',
        driverPhone: body.driverPhone,
        vehicleType: body.vehicleType || '16ft Container Lorry',
      };
      db.vehicles.push(newVehicle);
      await saveDb(db);
      return newVehicle;
    }
  }

  // 4. GET /api/auth/users & POST /api/auth/users
  if (path === '/api/auth/users') {
    if (method === 'GET') {
      return db.users.map((u) => ({
        ...u,
        assignedBranch: db.branches.find((b) => b.id === u.assignedBranchId),
      }));
    }
    if (method === 'POST') {
      const created = {
        id: `usr-${Date.now()}`,
        username: body.username,
        email: body.email || `${body.username}@trendyapparel.lk`,
        fullName: body.fullName,
        password: body.password || 'password123',
        role: body.role || 'DISPATCH_OFFICER',
        assignedBranchId: body.assignedBranchId || db.branches[0].id,
        isActive: true,
        createdAt: new Date().toISOString(),
      };
      db.users.push(created);
      await saveDb(db);
      return {
        ...created,
        assignedBranch: db.branches.find((b) => b.id === created.assignedBranchId),
      };
    }
  }

  // 5. GET /api/dashboard/overview
  if (path === '/api/dashboard/overview' && method === 'GET') {
    const hydrated = db.consignments.map((c) => hydrateConsignment(c, db));
    const inTransit = hydrated.filter((c) => c.status === 'IN_TRANSIT');
    const openDiscrepancies = db.discrepancies.filter((d) => d.resolutionStatus !== 'RESOLVED');
    const totalShortagePieces = openDiscrepancies.reduce(
      (sum, d) => sum + Math.abs(Number(d.varianceQty) || 0),
      0
    );

    return {
      kpis: {
        totalConsignments: hydrated.length,
        activeInTransitVehicles: inTransit.length,
        inTransitPieces: inTransit.reduce((s, c) => s + (Number(c.dispatchedQty) || 0), 0),
        totalDispatchedPieces: hydrated.reduce((s, c) => s + (Number(c.dispatchedQty) || 0), 0),
        openDiscrepanciesCount: openDiscrepancies.length,
        totalShortagePieces,
        overdueCount: 0,
      },
      overdueAlerts: [],
    };
  }

  // 6. GET /api/transfers & POST /api/transfers
  if (path === '/api/transfers') {
    if (method === 'GET') {
      return db.consignments.map((c) => hydrateConsignment(c, db));
    }
    if (method === 'POST') {
      const nextNum = 1001 + db.consignments.length;
      const transferCode = `TR-2026-${nextNum}`;
      const qrPassHash = makeSimpleHash(`${transferCode}-${body.garmentStyle}-${Date.now()}`);
      const created = {
        id: `tr-${Date.now()}`,
        transferCode,
        garmentStyle: body.garmentStyle,
        garmentColor: body.garmentColor,
        sizeBreakdown: body.sizeBreakdown || { S: 0, M: 0, L: 0, XL: 0 },
        dispatchedQty: Number(body.dispatchedQty) || 0,
        receivedQty: null,
        status: 'CREATED',
        qrPassHash,
        qrDataUrl: `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(
          transferCode
        )}`,
        sourceBranchId: body.sourceBranchId || db.branches[0].id,
        destinationBranchId: body.destinationBranchId || db.branches[1].id,
        vehicleId: body.vehicleId || db.vehicles[0].id,
        createdById: currentUser?.id || 'usr-dispatch',
        expectedTransitMinutes: Number(body.expectedTransitMinutes) || 120,
        notes: body.notes || '',
        createdAt: new Date().toISOString(),
        dispatchedAt: null,
        receivedAt: null,
        scanLogs: [],
      };
      db.consignments.unshift(created);
      await saveDb(db);
      return hydrateConsignment(created, db);
    }
  }

  // Helper to locate a consignment by qrPayload
  const findConsignment = (rawPayload) => {
    const raw = (rawPayload || '').trim();
    let code = raw;
    if (raw.startsWith('{')) {
      try {
        const parsed = JSON.parse(raw);
        code = parsed.code || parsed.transferCode || raw;
      } catch {
        // ignore
      }
    }
    return db.consignments.find(
      (c) =>
        c.transferCode.toLowerCase() === code.toLowerCase() ||
        c.qrPassHash.toLowerCase() === code.toLowerCase() ||
        c.id === code
    );
  };

  // 7. Scanner Endpoints
  if (path === '/api/scanner/verify-qr' && method === 'POST') {
    const found = findConsignment(body.qrPayload);
    if (!found) {
      throw new Error(`No gate pass found matching '${body.qrPayload}'.`);
    }
    return {
      verified: true,
      consignment: hydrateConsignment(found, db),
    };
  }

  if (path === '/api/scanner/gate-out' && method === 'POST') {
    const found = findConsignment(body.qrPayload);
    if (!found) {
      throw new Error(`Gate pass '${body.qrPayload}' not found.`);
    }
    found.status = 'IN_TRANSIT';
    found.dispatchedAt = new Date().toISOString();
    found.scanLogs = found.scanLogs || [];
    found.scanLogs.push({
      id: `sc-${Date.now()}`,
      scanType: 'SOURCE_OUT',
      scannedAt: new Date().toISOString(),
      scannedById: currentUser?.id || 'usr-security',
      branchId: found.sourceBranchId,
      comments: 'Exit scan logged at source facility gate',
    });
    await saveDb(db);
    return {
      message: `${found.transferCode} cleared Source Gate. Status: IN_TRANSIT.`,
      consignment: hydrateConsignment(found, db),
    };
  }

  if (path === '/api/scanner/gate-in' && method === 'POST') {
    const found = findConsignment(body.qrPayload);
    if (!found) {
      throw new Error(`Gate pass '${body.qrPayload}' not found.`);
    }
    found.scanLogs = found.scanLogs || [];
    found.scanLogs.push({
      id: `sc-${Date.now()}`,
      scanType: 'DESTINATION_IN',
      scannedAt: new Date().toISOString(),
      scannedById: currentUser?.id || 'usr-security',
      branchId: found.destinationBranchId,
      comments: 'Vehicle arrival logged at destination gate',
    });
    await saveDb(db);
    return {
      message: `${found.transferCode} arrival logged at Destination Gate.`,
      consignment: hydrateConsignment(found, db),
    };
  }

  if (path === '/api/scanner/receive' && method === 'POST') {
    const found = findConsignment(body.qrPayload);
    if (!found) {
      throw new Error(`Gate pass '${body.qrPayload}' not found.`);
    }
    const recQty = Number(body.receivedQty);
    found.receivedQty = recQty;
    found.receivedAt = new Date().toISOString();
    const variance = recQty - Number(found.dispatchedQty);

    found.scanLogs = found.scanLogs || [];
    found.scanLogs.push({
      id: `sc-${Date.now()}`,
      scanType: 'INTAKE_VERIFICATION',
      scannedAt: new Date().toISOString(),
      scannedById: currentUser?.id || 'usr-receiver',
      branchId: found.destinationBranchId,
      recordedQty: recQty,
      comments: body.comments || `Counted ${recQty} pcs at receiving dock`,
    });

    if (variance !== 0) {
      found.status = 'DISCREPANCY';
      db.discrepancies.unshift({
        id: `dsc-${Date.now()}`,
        consignmentId: found.id,
        dispatchedQty: found.dispatchedQty,
        receivedQty: recQty,
        varianceQty: variance,
        resolutionStatus: 'OPEN',
        reportedById: currentUser?.id || 'usr-receiver',
        comments:
          body.comments ||
          `Automatic variance alert: Dispatched ${found.dispatchedQty} pcs vs Received ${recQty} pcs.`,
        createdAt: new Date().toISOString(),
        resolvedAt: null,
      });
    } else {
      found.status = 'RECEIVED';
    }

    await saveDb(db);
    return {
      message:
        variance === 0
          ? `${found.transferCode} verified (${recQty} pcs). Zero variance!`
          : `ALERT: Variance of ${variance} pcs detected on ${found.transferCode}!`,
      consignment: hydrateConsignment(found, db),
    };
  }

  if (path === '/api/scanner/sync' && method === 'POST') {
    const scans = body.scans || [];
    return {
      syncedCount: scans.length,
      message: `Synced ${scans.length} queued scan(s).`,
    };
  }

  // 8. Discrepancy Endpoints
  if (path === '/api/discrepancies' && method === 'GET') {
    return db.discrepancies.map((d) => {
      const rawCon = db.consignments.find((c) => c.id === d.consignmentId) || db.consignments[0];
      return {
        ...d,
        consignment: hydrateConsignment(rawCon, db),
        reportedBy: db.users.find((u) => u.id === d.reportedById) || db.users[3],
      };
    });
  }

  const resolveMatch = path.match(/^\/api\/discrepancies\/([^/]+)\/resolve$/);
  if (resolveMatch && method === 'PATCH') {
    const dscId = resolveMatch[1];
    const target = db.discrepancies.find((d) => d.id === dscId);
    if (!target) {
      throw new Error('Discrepancy record not found.');
    }
    target.resolutionStatus = body.resolutionStatus || 'RESOLVED';
    if (body.comments) {
      target.comments = body.comments;
    }
    if (target.resolutionStatus === 'RESOLVED') {
      target.resolvedAt = new Date().toISOString();
      const con = db.consignments.find((c) => c.id === target.consignmentId);
      if (con) con.status = 'RESOLVED';
    }
    await saveDb(db);
    return target;
  }

  return {};
}
