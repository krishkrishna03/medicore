const express = require('express');
const { User, Patient, Appointment, Billing, Notification } = require('../database/models');
const { authenticateToken, requireRole } = require('../middleware/auth');

const router = express.Router();
router.use(authenticateToken, requireRole('patient'));

// ─── PROFILE ─────────────────────────────────────────────────────────────────
router.get('/profile', async (req, res) => {
    try {
        const user = await User.findById(req.user.id).select('-password');
        const patient = await Patient.findOne({ user_id: req.user.id });
        if (!patient) return res.status(404).json({ success: false, message: 'Profile not found' });

        res.json({
            success: true,
            data: {
                user_id: user._id, name: user.name, email: user.email, phone: user.phone, created_at: user.createdAt,
                patient_id: patient._id, date_of_birth: patient.date_of_birth, gender: patient.gender,
                blood_group: patient.blood_group, address: patient.address, emergency_contact: patient.emergency_contact,
                emergency_phone: patient.emergency_phone, medical_history: patient.medical_history, allergies: patient.allergies,
            },
        });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

router.put('/profile', async (req, res) => {
    try {
        const { name, phone, date_of_birth, gender, blood_group, address,
            emergency_contact, emergency_phone, medical_history, allergies } = req.body;
        await User.findByIdAndUpdate(req.user.id, { name, phone });
        await Patient.findOneAndUpdate({ user_id: req.user.id }, {
            date_of_birth, gender, blood_group, address, emergency_contact, emergency_phone, medical_history, allergies,
        });
        res.json({ success: true, message: 'Profile updated' });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

// ─── DASHBOARD STATS ─────────────────────────────────────────────────────────
router.get('/stats', async (req, res) => {
    try {
        const patient = await Patient.findOne({ user_id: req.user.id });
        if (!patient) return res.status(404).json({ success: false, message: 'Not found' });

        const today = new Date().toISOString().split('T')[0];

        const [totalAppts, upcoming, completed, bills, recentRaw] = await Promise.all([
            Appointment.countDocuments({ patient_id: patient._id }),
            Appointment.countDocuments({ patient_id: patient._id, appointment_date: { $gte: today }, status: { $ne: 'cancelled' } }),
            Appointment.countDocuments({ patient_id: patient._id, status: 'completed' }),
            Billing.find({ patient_id: patient._id, status: 'unpaid' }, 'amount'),
            Appointment.find({ patient_id: patient._id }).sort({ appointment_date: -1 }).limit(5)
                .populate({ path: 'doctor_id', select: 'specialization consultation_fee', populate: { path: 'user_id', select: 'name' } }),
        ]);

        const pendingBillAmount = bills.reduce((s, b) => s + b.amount, 0);
        const recentAppointments = recentRaw.map(a => ({
            id: a._id, appointment_date: a.appointment_date, appointment_time: a.appointment_time,
            status: a.status, doctor_name: a.doctor_id?.user_id?.name || '—',
            specialization: a.doctor_id?.specialization, consultation_fee: a.doctor_id?.consultation_fee,
        }));

        res.json({ success: true, data: { totalAppointments: totalAppts, upcomingAppointments: upcoming, completedAppointments: completed, pendingBillAmount, recentAppointments } });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

// ─── APPOINTMENTS ─────────────────────────────────────────────────────────────
router.get('/appointments', async (req, res) => {
    try {
        const patient = await Patient.findOne({ user_id: req.user.id });
        if (!patient) return res.status(404).json({ success: false, message: 'Not found' });

        const appts = await Appointment.find({ patient_id: patient._id })
            .sort({ appointment_date: -1 })
            .populate({ path: 'doctor_id', select: 'specialization consultation_fee department', populate: { path: 'user_id', select: 'name phone' } });

        const data = appts.map(a => ({
            id: a._id, appointment_date: a.appointment_date, appointment_time: a.appointment_time,
            status: a.status, type: a.type, symptoms: a.symptoms, diagnosis: a.diagnosis, prescription: a.prescription,
            doctor_name: a.doctor_id?.user_id?.name || '—', doctor_phone: a.doctor_id?.user_id?.phone,
            specialization: a.doctor_id?.specialization, consultation_fee: a.doctor_id?.consultation_fee,
            department: a.doctor_id?.department,
        }));

        res.json({ success: true, data });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

// ─── BILLS ────────────────────────────────────────────────────────────────────
router.get('/bills', async (req, res) => {
    try {
        const patient = await Patient.findOne({ user_id: req.user.id });
        if (!patient) return res.status(404).json({ success: false, message: 'Not found' });

        const bills = await Billing.find({ patient_id: patient._id })
            .sort({ createdAt: -1 })
            .populate({
                path: 'appointment_id', select: 'appointment_date appointment_time doctor_id',
                populate: { path: 'doctor_id', select: 'specialization', populate: { path: 'user_id', select: 'name' } },
            });

        const data = bills.map(b => ({
            id: b._id, description: b.description, amount: b.amount, status: b.status,
            payment_method: b.payment_method, payment_date: b.payment_date, created_at: b.createdAt,
            appointment_date: b.appointment_id?.appointment_date,
            appointment_time: b.appointment_id?.appointment_time,
            doctor_name: b.appointment_id?.doctor_id?.user_id?.name || '—',
            specialization: b.appointment_id?.doctor_id?.specialization,
        }));

        res.json({ success: true, data });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

router.put('/bills/:id/pay', async (req, res) => {
    try {
        const { payment_method } = req.body;
        const patient = await Patient.findOne({ user_id: req.user.id });
        const bill = await Billing.findOne({ _id: req.params.id, patient_id: patient._id });
        if (!bill) return res.status(404).json({ success: false, message: 'Bill not found' });

        await Billing.findByIdAndUpdate(req.params.id, {
            status: 'paid',
            payment_method: payment_method || 'online',
            payment_date: new Date().toISOString().split('T')[0],
        });

        res.json({ success: true, message: 'Payment successful' });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

// ─── NOTIFICATIONS ────────────────────────────────────────────────────────────
router.get('/notifications', async (req, res) => {
    try {
        const notifs = await Notification.find({ user_id: req.user.id }).sort({ createdAt: -1 }).limit(20);
        res.json({ success: true, data: notifs });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

router.put('/notifications/:id/read', async (req, res) => {
    try {
        await Notification.findOneAndUpdate({ _id: req.params.id, user_id: req.user.id }, { is_read: true });
        res.json({ success: true });
    } catch {
        res.status(500).json({ success: false });
    }
});

module.exports = router;
