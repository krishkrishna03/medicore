const mongoose = require('mongoose');

// ===== USER =====
const userSchema = new mongoose.Schema({
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true },
    role: { type: String, enum: ['admin', 'doctor', 'patient'], required: true },
    name: { type: String, required: true, trim: true },
    phone: { type: String, default: '' },
    is_active: { type: Boolean, default: true },
}, { timestamps: true });

// ===== DOCTOR =====
const doctorSchema = new mongoose.Schema({
    user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    specialization: { type: String, required: true },
    qualification: { type: String, default: '' },
    experience_years: { type: Number, default: 0 },
    consultation_fee: { type: Number, default: 0 },
    department: { type: String, default: '' },
    bio: { type: String, default: '' },
    available_days: { type: String, default: 'Mon,Tue,Wed,Thu,Fri' },
    available_time_start: { type: String, default: '09:00' },
    available_time_end: { type: String, default: '17:00' },
}, { timestamps: true });

// ===== PATIENT =====
const patientSchema = new mongoose.Schema({
    user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    date_of_birth: { type: String, default: '' },
    gender: { type: String, default: '' },
    blood_group: { type: String, default: '' },
    address: { type: String, default: '' },
    emergency_contact: { type: String, default: '' },
    emergency_phone: { type: String, default: '' },
    medical_history: { type: String, default: '' },
    allergies: { type: String, default: '' },
}, { timestamps: true });

// ===== APPOINTMENT =====
const appointmentSchema = new mongoose.Schema({
    patient_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Patient', required: true },
    doctor_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Doctor', required: true },
    appointment_date: { type: String, required: true },
    appointment_time: { type: String, required: true },
    status: { type: String, enum: ['pending', 'confirmed', 'completed', 'cancelled'], default: 'pending' },
    type: { type: String, default: 'consultation' },
    symptoms: { type: String, default: '' },
    notes: { type: String, default: '' },
    prescription: { type: String, default: '' },
    diagnosis: { type: String, default: '' },
}, { timestamps: true });

// ===== BILLING =====
const billingSchema = new mongoose.Schema({
    patient_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Patient', required: true },
    appointment_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Appointment', default: null },
    amount: { type: Number, required: true },
    description: { type: String, default: 'Hospital Services' },
    status: { type: String, enum: ['unpaid', 'paid', 'cancelled'], default: 'unpaid' },
    payment_method: { type: String, default: '' },
    payment_date: { type: String, default: '' },
}, { timestamps: true });

// ===== MEDICINE =====
const medicineSchema = new mongoose.Schema({
    name: { type: String, required: true, trim: true },
    generic_name: { type: String, default: '' },
    category: { type: String, default: '' },
    quantity: { type: Number, default: 0 },
    unit: { type: String, default: 'tablet' },
    price: { type: Number, default: 0 },
    manufacturer: { type: String, default: '' },
    expiry_date: { type: String, default: '' },
}, { timestamps: true });

// ===== NOTIFICATION =====
const notificationSchema = new mongoose.Schema({
    user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    title: { type: String, required: true },
    message: { type: String, required: true },
    is_read: { type: Boolean, default: false },
}, { timestamps: true });

module.exports = {
    User: mongoose.model('User', userSchema),
    Doctor: mongoose.model('Doctor', doctorSchema),
    Patient: mongoose.model('Patient', patientSchema),
    Appointment: mongoose.model('Appointment', appointmentSchema),
    Billing: mongoose.model('Billing', billingSchema),
    Medicine: mongoose.model('Medicine', medicineSchema),
    Notification: mongoose.model('Notification', notificationSchema),
};
