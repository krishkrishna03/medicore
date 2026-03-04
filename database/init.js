const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const { User, Doctor, Patient, Medicine } = require('./models');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/hospital_hms';

async function initDatabase() {
  await mongoose.connect(MONGO_URI, {
    serverSelectionTimeoutMS: 5000,
  });
  console.log('✅ MongoDB connected:', MONGO_URI);

  // Seed default admin
  const adminExists = await User.findOne({ role: 'admin' });
  if (!adminExists) {
    const hashed = await bcrypt.hash('Admin@123', 10);
    await User.create({
      email: 'admin@hospital.com',
      password: hashed,
      role: 'admin',
      name: 'System Administrator',
      phone: '000-000-0000',
    });
    console.log('✅ Default admin created: admin@hospital.com / Admin@123');
  }

  // Seed sample medicines
  const medCount = await Medicine.countDocuments();
  if (medCount === 0) {
    await Medicine.insertMany([
      { name: 'Paracetamol', generic_name: 'Acetaminophen', category: 'Analgesic', quantity: 1000, unit: 'tablet', price: 2.5, manufacturer: 'PharmaCo', expiry_date: '2026-12-31' },
      { name: 'Amoxicillin', generic_name: 'Amoxicillin', category: 'Antibiotic', quantity: 500, unit: 'capsule', price: 8.0, manufacturer: 'MediPharm', expiry_date: '2025-12-31' },
      { name: 'Ibuprofen', generic_name: 'Ibuprofen', category: 'NSAID', quantity: 800, unit: 'tablet', price: 5.0, manufacturer: 'HealthGen', expiry_date: '2026-06-30' },
      { name: 'Omeprazole', generic_name: 'Omeprazole', category: 'PPI', quantity: 600, unit: 'capsule', price: 12.0, manufacturer: 'GastroMed', expiry_date: '2026-09-30' },
      { name: 'Metformin', generic_name: 'Metformin HCl', category: 'Antidiabetic', quantity: 400, unit: 'tablet', price: 6.5, manufacturer: 'DiabaCare', expiry_date: '2025-12-31' },
      { name: 'Amlodipine', generic_name: 'Amlodipine', category: 'Calcium Channel Blocker', quantity: 300, unit: 'tablet', price: 15.0, manufacturer: 'CardioMed', expiry_date: '2026-03-31' },
      { name: 'Cetirizine', generic_name: 'Cetirizine HCl', category: 'Antihistamine', quantity: 700, unit: 'tablet', price: 4.0, manufacturer: 'AllerCare', expiry_date: '2026-12-31' },
      { name: 'Azithromycin', generic_name: 'Azithromycin', category: 'Antibiotic', quantity: 200, unit: 'tablet', price: 25.0, manufacturer: 'MediPharm', expiry_date: '2025-09-30' },
    ]);
    console.log('✅ Sample medicines seeded');
  }

  console.log('✅ Database initialization complete');
}

module.exports = { initDatabase };
