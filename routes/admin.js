const express = require('express');
const bcrypt = require('bcryptjs');
const { User, Doctor, Patient, Appointment, Billing, Notification } = require('../database/models');
const { authenticateToken, requireRole } = require('../middleware/auth');
const { sendDoctorWelcomeEmail } = require('../services/email');

const router = express.Router();
router.use(authenticateToken, requireRole('admin'));

// ─── DASHBOARD STATS ────────────────────────────────────────────────────────
router.get('/stats', async (req, res) => {
    try {
        const today = new Date().toISOString().split('T')[0];

        const [totalDoctors, totalPatients, todayAppts, pendingAppts, allBills, recentAppts, lowMeds] = await Promise.all([
            User.countDocuments({ role: 'doctor', is_active: true }),
            User.countDocuments({ role: 'patient', is_active: true }),
            Appointment.countDocuments({ appointment_date: today }),
            Appointment.countDocuments({ status: 'pending' }),
            Billing.find({}, 'amount status'),
            Appointment.find()
                .sort({ createdAt: -1 }).limit(5)
                .populate({ path: 'patient_id', populate: { path: 'user_id', select: 'name' } })
                .populate({ path: 'doctor_id', populate: { path: 'user_id', select: 'name' } }),
            require('../database/models').Medicine.find({ quantity: { $lt: 100 } }).sort({ quantity: 1 }).limit(5),
        ]);

        const totalRevenue = allBills.filter(b => b.status === 'paid').reduce((s, b) => s + b.amount, 0);
        const pendingBills = allBills.filter(b => b.status === 'unpaid').length;

        // attach `id` helper to medicines so frontend can use either property
        const lowStockMeds = lowMeds.map(m => {
            const obj = m.toObject ? m.toObject() : { ...m };
            obj.id = obj._id; // alias for convenience
            return obj;
        });

        const recentAppointments = recentAppts.map(a => ({
            id: a._id,
            patient_name: a.patient_id?.user_id?.name || '—',
            doctor_name: a.doctor_id?.user_id?.name || '—',
            specialization: a.doctor_id?.specialization || '—',
            appointment_date: a.appointment_date,
            appointment_time: a.appointment_time,
            status: a.status,
        }));

        res.json({
            success: true,
            data: { totalDoctors, totalPatients, todayAppointments: todayAppts, pendingAppointments: pendingAppts, totalRevenue, pendingBills, recentAppointments, lowStockMeds },
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

// ─── DOCTORS ────────────────────────────────────────────────────────────────
router.get('/doctors', async (req, res) => {
    try {
        const doctors = await Doctor.find().populate('user_id', 'name email phone is_active createdAt').sort({ createdAt: -1 });
        const apptCounts = await Appointment.aggregate([
            { $group: { _id: '$doctor_id', count: { $sum: 1 } } },
        ]);
        const countMap = {};
        apptCounts.forEach(a => { countMap[a._id.toString()] = a.count; });

        const data = doctors.map(d => ({
            doctor_id: d._id,
            user_id: d.user_id?._id,
            name: d.user_id?.name,
            email: d.user_id?.email,
            phone: d.user_id?.phone,
            is_active: d.user_id?.is_active,
            created_at: d.user_id?.createdAt,
            specialization: d.specialization,
            qualification: d.qualification,
            experience_years: d.experience_years,
            consultation_fee: d.consultation_fee,
            department: d.department,
            bio: d.bio,
            available_days: d.available_days,
            available_time_start: d.available_time_start,
            available_time_end: d.available_time_end,
            total_appointments: countMap[d._id.toString()] || 0,
        }));

        res.json({ success: true, data });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

router.post('/doctors', async (req, res) => {
    try {
        const { name, email, phone, password, specialization, qualification, experience_years,
            consultation_fee, department, bio, available_days, available_time_start, available_time_end } = req.body;

        if (!name || !email || !specialization)
            return res.status(400).json({ success: false, message: 'Name, email and specialization required' });

        const existing = await User.findOne({ email: email.toLowerCase() });
        if (existing) return res.status(409).json({ success: false, message: 'Email already exists' });

        const plainPassword = password || `Doc@${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
        const hashed = await bcrypt.hash(plainPassword, 10);

        const user = await User.create({ email: email.toLowerCase(), password: hashed, role: 'doctor', name, phone: phone || '' });
        const doctor = await Doctor.create({
            user_id: user._id, specialization, qualification: qualification || '',
            experience_years: experience_years || 0, consultation_fee: consultation_fee || 0,
            department: department || '', bio: bio || '',
            available_days: available_days || 'Mon,Tue,Wed,Thu,Fri',
            available_time_start: available_time_start || '09:00',
            available_time_end: available_time_end || '17:00',
        });

        await Notification.create({
            user_id: user._id,
            title: 'Welcome to the Hospital System',
            message: `Your doctor account has been created. Login: ${email} / Password: ${plainPassword}`,
        });

        // Send welcome email with credentials (non-blocking)
        sendDoctorWelcomeEmail({ name, email, password: plainPassword, specialization, department }).catch(e => {
            console.warn('Email send failed (non-critical):', e.message);
        });

        res.status(201).json({
            success: true, message: 'Doctor added successfully',
            data: { doctorId: doctor._id, userId: user._id, email, plainPassword },
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

router.put('/doctors/:id', async (req, res) => {
    try {
        const { name, phone, specialization, qualification, experience_years, consultation_fee,
            department, bio, available_days, available_time_start, available_time_end, is_active } = req.body;

        const doctor = await Doctor.findById(req.params.id);
        if (!doctor) return res.status(404).json({ success: false, message: 'Doctor not found' });

        await Doctor.findByIdAndUpdate(req.params.id, {
            specialization, qualification, experience_years, consultation_fee,
            department, bio, available_days, available_time_start, available_time_end,
        });
        await User.findByIdAndUpdate(doctor.user_id, { name, phone, is_active: is_active !== undefined ? is_active : true });

        res.json({ success: true, message: 'Doctor updated' });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

router.delete('/doctors/:id', async (req, res) => {
    try {
        const doctor = await Doctor.findById(req.params.id);
        if (!doctor) return res.status(404).json({ success: false, message: 'Doctor not found' });
        await User.findByIdAndUpdate(doctor.user_id, { is_active: false });
        res.json({ success: true, message: 'Doctor deactivated' });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

// ─── PATIENTS ───────────────────────────────────────────────────────────────
router.get('/patients', async (req, res) => {
    try {
        const patients = await Patient.find().populate('user_id', 'name email phone is_active createdAt').sort({ createdAt: -1 });
        const apptCounts = await Appointment.aggregate([{ $group: { _id: '$patient_id', count: { $sum: 1 } } }]);
        const countMap = {};
        apptCounts.forEach(a => { countMap[a._id.toString()] = a.count; });

        const data = patients.map(p => ({
            patient_id: p._id,
            user_id: p.user_id?._id,
            name: p.user_id?.name,
            email: p.user_id?.email,
            phone: p.user_id?.phone,
            is_active: p.user_id?.is_active,
            created_at: p.user_id?.createdAt,
            date_of_birth: p.date_of_birth,
            gender: p.gender,
            blood_group: p.blood_group,
            address: p.address,
            emergency_contact: p.emergency_contact,
            emergency_phone: p.emergency_phone,
            allergies: p.allergies,
            total_appointments: countMap[p._id.toString()] || 0,
        }));

        res.json({ success: true, data });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

router.get('/patients/:id', async (req, res) => {
    try {
        const patient = await Patient.findById(req.params.id).populate('user_id', 'name email phone');
        if (!patient) return res.status(404).json({ success: false, message: 'Patient not found' });

        const appointments = await Appointment.find({ patient_id: patient._id })
            .sort({ appointment_date: -1 })
            .populate({ path: 'doctor_id', select: 'specialization', populate: { path: 'user_id', select: 'name' } });

        const apptList = appointments.map(a => ({
            id: a._id,
            doctor_name: a.doctor_id?.user_id?.name || '—',
            specialization: a.doctor_id?.specialization || '—',
            appointment_date: a.appointment_date,
            appointment_time: a.appointment_time,
            status: a.status,
        }));

        res.json({
            success: true,
            data: {
                name: patient.user_id?.name, email: patient.user_id?.email, phone: patient.user_id?.phone,
                date_of_birth: patient.date_of_birth, gender: patient.gender, blood_group: patient.blood_group,
                address: patient.address, emergency_contact: patient.emergency_contact, emergency_phone: patient.emergency_phone,
                allergies: patient.allergies, medical_history: patient.medical_history,
                appointments: apptList,
            },
        });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

// ─── ALL APPOINTMENTS ────────────────────────────────────────────────────────
router.get('/appointments', async (req, res) => {
    try {
        const appts = await Appointment.find()
            .sort({ appointment_date: -1 })
            .populate({ path: 'patient_id', populate: { path: 'user_id', select: 'name' } })
            .populate({ path: 'doctor_id', select: 'specialization', populate: { path: 'user_id', select: 'name' } });

        const data = appts.map(a => ({
            id: a._id,
            patient_name: a.patient_id?.user_id?.name || '—',
            doctor_name: a.doctor_id?.user_id?.name || '—',
            specialization: a.doctor_id?.specialization || '—',
            appointment_date: a.appointment_date,
            appointment_time: a.appointment_time,
            type: a.type,
            status: a.status,
        }));

        res.json({ success: true, data });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

module.exports = router;
