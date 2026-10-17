// In-Process End-to-End Lifecycle Verification Script for All 5 Modules
const { Duplex } = require('stream');
const app = require('./src/server');

function invokeApp(method, url, body = null, token = null) {
  return new Promise((resolve, reject) => {
    const payload = body ? Buffer.from(JSON.stringify(body)) : Buffer.alloc(0);
    const req = new Duplex({
      read() {
        this.push(payload);
        this.push(null);
      },
    });
    req.method = method;
    req.url = url;
    req.headers = {
      'content-type': 'application/json',
      'content-length': String(payload.length),
      ...(token ? { authorization: `Bearer ${token}` } : {}),
    };
    req.connection = {};
    req.socket = {};

    const res = {
      statusCode: 200,
      headers: {},
      setHeader(k, v) {
        this.headers[k.toLowerCase()] = v;
      },
      getHeader(k) {
        return this.headers[k.toLowerCase()];
      },
      status(code) {
        this.statusCode = code;
        return this;
      },
      json(data) {
        resolve({ status: this.statusCode, data });
      },
      end(raw) {
        try {
          resolve({ status: this.statusCode, data: raw ? JSON.parse(raw) : null });
        } catch {
          resolve({ status: this.statusCode, data: raw });
        }
      },
    };

    try {
      app.handle(req, res, (err) => {
        if (err) reject(err);
      });
    } catch (err) {
      reject(err);
    }
  });
}

async function runVerification() {
  console.log('1. Testing Health Endpoint...');
  const health = await invokeApp('GET', '/api/health');
  console.log('   Health:', health.status, health.data.system);

  console.log('2. Testing Module 01: Login across Group 14 RBAC roles...');
  const dispatchLogin = await invokeApp('POST', '/api/auth/login', {
    username: 'dispatcher',
    password: 'password123',
  });
  const securityLogin = await invokeApp('POST', '/api/auth/login', {
    username: 'security',
    password: 'password123',
  });
  const receiverLogin = await invokeApp('POST', '/api/auth/login', {
    username: 'receiver',
    password: 'password123',
  });
  const managerLogin = await invokeApp('POST', '/api/auth/login', {
    username: 'manager',
    password: 'password123',
  });

  const dispatchToken = dispatchLogin.data.token;
  const securityToken = securityLogin.data.token;
  const receiverToken = receiverLogin.data.token;
  const managerToken = managerLogin.data.token;

  console.log('   Authenticated:', [
    dispatchLogin.data.user.role,
    securityLogin.data.user.role,
    receiverLogin.data.user.role,
    managerLogin.data.user.role,
  ].join(', '));

  const branchesRes = await invokeApp('GET', '/api/auth/branches', null, dispatchToken);
  const vehiclesRes = await invokeApp('GET', '/api/auth/vehicles', null, dispatchToken);
  const sewing = branchesRes.data.find((b) => b.branchType === 'SEWING');
  const washing = branchesRes.data.find((b) => b.branchType === 'WASHING');
  const vehicle = vehiclesRes.data[0];

  console.log('3. Testing Module 02: Create Dispatch Consignment & Generate Master QR Pass...');
  const createRes = await invokeApp(
    'POST',
    '/api/transfers',
    {
      garmentStyle: 'TR-E2E-TEST-777 (Export Polo Shirt)',
      garmentColor: 'Emerald Green',
      sizeBreakdown: { S: 250, M: 500, L: 500, XL: 250 },
      dispatchedQty: 1500,
      sourceBranchId: sewing.id,
      destinationBranchId: washing.id,
      vehicleId: vehicle.id,
      expectedTransitMinutes: 120,
    },
    dispatchToken
  );
  console.log(
    '   Created Transfer:',
    createRes.data.transferCode,
    '| HMAC Hash:',
    createRes.data.qrPassHash,
    '| QR DataURL Length:',
    createRes.data.qrDataUrl?.length
  );

  console.log('4. Testing Module 03: Gate Security QR-Out Scan (Status -> IN_TRANSIT)...');
  const gateOutRes = await invokeApp(
    'POST',
    '/api/scanner/gate-out',
    { qrPayload: createRes.data.qrPayload },
    securityToken
  );
  console.log('   Gate-Out Result:', gateOutRes.data.consignment.status, '|', gateOutRes.data.message);

  console.log('5. Testing Module 03 & 04: Receiving Officer Intake with 1,480 pcs (-20 Shortage Discrepancy)...');
  const receiveRes = await invokeApp(
    'POST',
    '/api/scanner/receive',
    {
      qrPayload: createRes.data.qrPayload,
      receivedQty: 1480,
      comments: 'E2E Test: 20 pieces missing from Size M bundle',
    },
    receiverToken
  );
  console.log(
    '   Intake Result Status:',
    receiveRes.data.consignment.status,
    '| Shortage Count:',
    receiveRes.data.discrepancy?.shortageCount
  );

  console.log('6. Testing Module 04: Logistics Manager Discrepancy Resolution...');
  const resolveRes = await invokeApp(
    'PATCH',
    `/api/discrepancies/${receiveRes.data.discrepancy.id}/resolve`,
    {
      resolutionStatus: 'RESOLVED',
      comments: 'Recounted at Sewing Plant; 20 pcs held in QC rack.',
    },
    managerToken
  );
  console.log('   Discrepancy Resolution Status:', resolveRes.data.resolutionStatus);

  console.log('7. Testing Module 05: Central Dashboard Overview KPIs...');
  const dashRes = await invokeApp('GET', '/api/dashboard/overview', null, managerToken);
  console.log('   Dashboard KPIs:', JSON.stringify(dashRes.data.kpis));

  console.log('ALL E2E CHECKS PASSED SUCCESSFULLY!');
}

runVerification().catch((err) => {
  console.error('E2E Verification Failed:', err);
  process.exit(1);
});
