const express = require('express');
const { User, Doctor, Patient, Appointment, Billing, Notification } = require('../database/models');
const { authenticateToken, requireRole } = require('../middleware/auth');

const router = express.Router();
router.use(authenticateToken, requireRole('doctor'));

// ─── PROFILE ─────────────────────────────────────────────────────────────────
router.get('/profile', async (req, res) => {
    try {
        const user = await User.findById(req.user.id).select('-password');
        const doctor = await Doctor.findOne({ user_id: req.user.id });
        if (!doctor) return res.status(404).json({ success: false, message: 'Doctor profile not found' });

        res.json({
            success: true,
            data: {
                user_id: user._id, name: user.name, email: user.email, phone: user.phone, created_at: user.createdAt,
                doctor_id: doctor._id, specialization: doctor.specialization, qualification: doctor.qualification,
                experience_years: doctor.experience_years, consultation_fee: doctor.consultation_fee,
                department: doctor.department, bio: doctor.bio, available_days: doctor.available_days,
                available_time_start: doctor.available_time_start, available_time_end: doctor.available_time_end,
            },
        });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

router.put('/profile', async (req, res) => {
    try {
        const { phone, bio, available_days, available_time_start, available_time_end, consultation_fee } = req.body;
        await User.findByIdAndUpdate(req.user.id, { phone });
        await Doctor.findOneAndUpdate({ user_id: req.user.id }, { bio, available_days, available_time_start, available_time_end, consultation_fee });
        res.json({ success: true, message: 'Profile updated' });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

// ─── DASHBOARD STATS ─────────────────────────────────────────────────────────
router.get('/stats', async (req, res) => {
    try {
        const doctor = await Doctor.findOne({ user_id: req.user.id });
        if (!doctor) return res.status(404).json({ success: false, message: 'Not found' });

        const today = new Date().toISOString().split('T')[0];

        const [totalPatients, todayAppts, pendingAppts, completedAppts, upcoming] = await Promise.all([
            Appointment.distinct('patient_id', { doctor_id: doctor._id }),
            Appointment.countDocuments({ doctor_id: doctor._id, appointment_date: today }),
            Appointment.countDocuments({ doctor_id: doctor._id, status: 'pending' }),
            Appointment.countDocuments({ doctor_id: doctor._id, status: 'completed' }),
            Appointment.find({ doctor_id: doctor._id, appointment_date: { $gte: today }, status: { $ne: 'cancelled' } })
                .sort({ appointment_date: 1, appointment_time: 1 }).limit(10)
                .populate({ path: 'patient_id', select: 'blood_group gender date_of_birth', populate: { path: 'user_id', select: 'name phone' } }),
        ]);

        const upcomingAppointments = upcoming.map(a => ({
            id: a._id,
            patient_name: a.patient_id?.user_id?.name || '—',
            patient_phone: a.patient_id?.user_id?.phone || '—',
            blood_group: a.patient_id?.blood_group,
            gender: a.patient_id?.gender,
            date_of_birth: a.patient_id?.date_of_birth,
            symptoms: a.symptoms,
            appointment_date: a.appointment_date,
            appointment_time: a.appointment_time,
            status: a.status,
            type: a.type,
        }));

        res.json({
            success: true,
            data: {
                totalPatients: totalPatients.length, todayAppointments: todayAppts,
                pendingAppointments: pendingAppts, completedAppointments: completedAppts,
                upcomingAppointments,
            },
        });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

// ─── APPOINTMENTS ─────────────────────────────────────────────────────────────
router.get('/appointments', async (req, res) => {
    try {
        const doctor = await Doctor.findOne({ user_id: req.user.id });
        if (!doctor) return res.status(404).json({ success: false, message: 'Not found' });

        const filter = { doctor_id: doctor._id };
        if (req.query.status) filter.status = req.query.status;
        if (req.query.date) filter.appointment_date = req.query.date;

        const appts = await Appointment.find(filter)
            .sort({ appointment_date: -1, appointment_time: 1 })
            .populate({ path: 'patient_id', select: 'blood_group gender date_of_birth allergies', populate: { path: 'user_id', select: 'name phone' } });

        const data = appts.map(a => ({
            id: a._id,
            patient_name: a.patient_id?.user_id?.name || '—',
            patient_phone: a.patient_id?.user_id?.phone || '—',
            blood_group: a.patient_id?.blood_group,
            gender: a.patient_id?.gender,
            date_of_birth: a.patient_id?.date_of_birth,
            allergies: a.patient_id?.allergies,
            appointment_date: a.appointment_date,
            appointment_time: a.appointment_time,
            status: a.status, type: a.type, symptoms: a.symptoms,
            notes: a.notes, prescription: a.prescription, diagnosis: a.diagnosis,
        }));

        res.json({ success: true, data });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

// Update appointment (add prescription, diagnosis, status)
router.put('/appointments/:id', async (req, res) => {
    try {
        const { status, notes, prescription, diagnosis } = req.body;
        const doctor = await Doctor.findOne({ user_id: req.user.id });

        const appt = await Appointment.findOne({ _id: req.params.id, doctor_id: doctor._id });
        if (!appt) return res.status(404).json({ success: false, message: 'Appointment not found' });

        await Appointment.findByIdAndUpdate(req.params.id, {
            ...(status && { status }),
            ...(notes !== undefined && { notes }),
            ...(prescription !== undefined && { prescription }),
            ...(diagnosis !== undefined && { diagnosis }),
        });

        // Auto-create billing when appointment is completed
        if (status === 'completed' && appt.status !== 'completed') {
            await Billing.create({
                patient_id: appt.patient_id,
                appointment_id: appt._id,
                amount: doctor.consultation_fee || 0,
                description: 'Consultation Fee',
                status: 'unpaid',
            });
        }

        // Notify patient
        const patient = await Patient.findById(appt.patient_id);
        if (patient) {
            await Notification.create({
                user_id: patient.user_id,
                title: 'Appointment Updated',
                message: `Your appointment status has been updated to: ${status}`,
            });
        }

        res.json({ success: true, message: 'Appointment updated' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

// ─── MY PATIENTS ──────────────────────────────────────────────────────────────
router.get('/patients', async (req, res) => {
    try {
        const doctor = await Doctor.findOne({ user_id: req.user.id });
        if (!doctor) return res.status(404).json({ success: false, message: 'Not found' });

        const result = await Appointment.aggregate([
            { $match: { doctor_id: doctor._id, status: 'completed' } },
            { $group: { _id: '$patient_id', visit_count: { $sum: 1 }, last_visit: { $max: '$appointment_date' } } },
            { $sort: { last_visit: -1 } },
        ]);

        const patientData = await Promise.all(result.map(async r => {
            const patient = await Patient.findById(r._id).populate('user_id', 'name email phone');
            if (!patient) return null;
            return {
                patient_id: patient._id,
                name: patient.user_id?.name, email: patient.user_id?.email, phone: patient.user_id?.phone,
                gender: patient.gender, blood_group: patient.blood_group, date_of_birth: patient.date_of_birth,
                allergies: patient.allergies, visit_count: r.visit_count, last_visit: r.last_visit,
            };
        }));

        res.json({ success: true, data: patientData.filter(Boolean) });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

router.get('/patients/:id', async (req, res) => {
    try {
        const doctor = await Doctor.findOne({ user_id: req.user.id });
        // Ensure doctor has an appointment with this patient
        const hasRelation = await Appointment.findOne({ doctor_id: doctor._id, patient_id: req.params.id });
        if (!hasRelation) return res.status(404).json({ success: false, message: 'Patient not found' });

        const patient = await Patient.findById(req.params.id).populate('user_id', 'name email phone');
        const appointments = await Appointment.find({ patient_id: req.params.id, doctor_id: doctor._id }).sort({ appointment_date: -1 });

        res.json({
            success: true,
            data: {
                name: patient.user_id?.name, email: patient.user_id?.email, phone: patient.user_id?.phone,
                gender: patient.gender, blood_group: patient.blood_group, date_of_birth: patient.date_of_birth,
                allergies: patient.allergies, medical_history: patient.medical_history,
                appointments: appointments.map(a => ({
                    id: a._id, appointment_date: a.appointment_date, appointment_time: a.appointment_time,
                    status: a.status, diagnosis: a.diagnosis, prescription: a.prescription,
                })),
            },
        });
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
