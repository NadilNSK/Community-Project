require('dotenv').config();
const express = require('express');
const cors = require('cors');

const authRoutes = require('./modules/auth/auth.routes');
const dispatchRoutes = require('./modules/dispatch/dispatch.routes');
const scannerRoutes = require('./modules/scanner/scanner.routes');
const discrepancyRoutes = require('./modules/discrepancies/discrepancy.routes');
const dashboardRoutes = require('./modules/dashboard/dashboard.routes');
const vehicleRoutes = require('./modules/vehicles/vehicle.routes');

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors());
app.use(express.json({ limit: '5mb' }));

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'OK',
    system: 'Smart Inter-Branch Garment Tracking & Gate Pass System',
    group: 'IS5109 - Group 14 (Sabaragamuwa University of Sri Lanka)',
    partner: 'Trendy (SE Apparel Pvt Ltd)',
    timestamp: new Date().toISOString(),
  });
});

// Register System Modules
app.use('/api/auth', authRoutes);
app.use('/api/transfers', dispatchRoutes);
app.use('/api/scanner', scannerRoutes);
app.use('/api/gate', scannerRoutes);
app.use('/api/vehicles', vehicleRoutes);
app.use('/api/discrepancies', discrepancyRoutes);
app.use('/api/dashboard', dashboardRoutes);

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`===================================================================`);
    console.log(` Smart Inter-Branch Garment Tracking & Gate Pass API running`);
    console.log(` Local URL   : http://localhost:${PORT}/api/health`);
    console.log(` Emulator URL: http://10.0.2.2:${PORT}/api/health`);
    console.log(`===================================================================`);
  });
}

module.exports = app;
