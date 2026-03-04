const express = require('express');
const cors = require('cors');
const path = require('path');
const { initDatabase } = require('./database/init');

const authRoutes = require('./routes/auth');
const adminRoutes = require('./routes/admin');
const doctorRoutes = require('./routes/doctor');
const patientRoutes = require('./routes/patient');
const appointmentRoutes = require('./routes/appointments');
const billingRoutes = require('./routes/billing');
const pharmacyRoutes = require('./routes/pharmacy');
const publicRoutes = require('./routes/public');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static frontend
app.use(express.static(path.join(__dirname, 'public')));

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/doctor', doctorRoutes);
app.use('/api/patient', patientRoutes);
app.use('/api/appointments', appointmentRoutes);
app.use('/api/billing', billingRoutes);
app.use('/api/pharmacy', pharmacyRoutes);
app.use('/api/public', publicRoutes);

// Serve frontend SPA for all non-API routes
app.get(/^(?!\/api).*$/, (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Initialize MongoDB then start server
initDatabase()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`🏥 Hospital Management System  →  http://localhost:${PORT}`);
      console.log(`🍃 Database: MongoDB`);
      console.log(`📋 Default Admin: admin@hospital.com / Admin@123`);
    });
  })
  .catch(err => {
    console.error('❌ Failed to connect to MongoDB:', err.message);
    console.error('   Make sure MongoDB is running: mongod');
    process.exit(1);
  });
