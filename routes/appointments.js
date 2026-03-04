const express = require('express');
const { User, Doctor, Patient, Appointment, Notification } = require('../database/models');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();
router.use(authenticateToken);

// ─── LIST AVAILABLE DOCTORS ───────────────────────────────────────────────────
router.get('/doctors', async (req, res) => {
    try {
        const { specialization } = req.query;

        // Find active doctor user IDs
        const userFilter = { role: 'doctor', is_active: true };
        const activeUsers = await User.find(userFilter, '_id');
        const userIds = activeUsers.map(u => u._id);

        const filter = { user_id: { $in: userIds } };
        if (specialization) filter.specialization = { $regex: specialization, $options: 'i' };

        const doctors = await Doctor.find(filter).populate('user_id', 'name phone').sort({ createdAt: 1 });

        const data = doctors.map(d => ({
            doctor_id: d._id,
            user_id: d.user_id?._id,
            name: d.user_id?.name,
            phone: d.user_id?.phone,
            specialization: d.specialization,
            qualification: d.qualification,
            experience_years: d.experience_years,
            consultation_fee: d.consultation_fee,
            department: d.department,
            bio: d.bio,
            available_days: d.available_days,
            available_time_start: d.available_time_start,
            available_time_end: d.available_time_end,
        }));

        res.json({ success: true, data });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

// ─── TIME SLOTS ──────────────────────────────────────────────────────────────
router.get('/slots/:doctorId/:date', async (req, res) => {
    try {
        const { doctorId, date } = req.params;
        const doctor = await Doctor.findById(doctorId);
        if (!doctor) return res.status(404).json({ success: false, message: 'Doctor not found' });

        // Check day availability
        const dayMap = { 0: 'Sun', 1: 'Mon', 2: 'Tue', 3: 'Wed', 4: 'Thu', 5: 'Fri', 6: 'Sat' };
        const dayOfWeek = new Date(date).getDay();
        const availDays = (doctor.available_days || '').split(',');
        if (!availDays.includes(dayMap[dayOfWeek])) {
            return res.json({ success: true, data: [], message: 'Doctor not available on this day' });
        }

        // Generate 30-min time slots
        const slots = [];
        const [startH, startM] = (doctor.available_time_start || '09:00').split(':').map(Number);
        const [endH, endM] = (doctor.available_time_end || '17:00').split(':').map(Number);
        let current = startH * 60 + startM;
        const end = endH * 60 + endM;
        while (current < end) {
            const h = Math.floor(current / 60).toString().padStart(2, '0');
            const m = (current % 60).toString().padStart(2, '0');
            slots.push(`${h}:${m}`);
            current += 30;
        }

        // Get booked slots
        const booked = await Appointment.find({
            doctor_id: doctorId,
            appointment_date: date,
            status: { $ne: 'cancelled' },
        }, 'appointment_time');

        const bookedTimes = booked.map(b => b.appointment_time);
        const available = slots.map(s => ({ time: s, available: !bookedTimes.includes(s) }));

        res.json({ success: true, data: available });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

// ─── BOOK APPOINTMENT ─────────────────────────────────────────────────────────
router.post('/', async (req, res) => {
    try {
        if (req.user.role !== 'patient')
            return res.status(403).json({ success: false, message: 'Only patients can book appointments' });

        const { doctor_id, appointment_date, appointment_time, type, symptoms } = req.body;
        if (!doctor_id || !appointment_date || !appointment_time)
            return res.status(400).json({ success: false, message: 'Doctor, date and time required' });

        const patient = await Patient.findOne({ user_id: req.user.id });
        if (!patient) return res.status(404).json({ success: false, message: 'Patient profile not found' });

        const doctor = await Doctor.findById(doctor_id);
        if (!doctor) return res.status(404).json({ success: false, message: 'Doctor not found' });

        // Check slot availability
        const conflict = await Appointment.findOne({
            doctor_id, appointment_date, appointment_time, status: { $ne: 'cancelled' },
        });
        if (conflict) return res.status(409).json({ success: false, message: 'This time slot is already booked' });

        const appt = await Appointment.create({
            patient_id: patient._id,
            doctor_id,
            appointment_date,
            appointment_time,
            type: type || 'consultation',
            symptoms: symptoms || '',
            status: 'pending',
        });

        // Notify doctor
        await Notification.create({
            user_id: doctor.user_id,
            title: 'New Appointment Booked',
            message: `A patient has booked an appointment on ${appointment_date} at ${appointment_time}`,
        });

        res.status(201).json({ success: true, message: 'Appointment booked successfully', data: { id: appt._id } });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

// ─── CANCEL ───────────────────────────────────────────────────────────────────
router.put('/:id/cancel', async (req, res) => {
    try {
        let filter = { _id: req.params.id };
        if (req.user.role === 'patient') {
            const patient = await Patient.findOne({ user_id: req.user.id });
            filter.patient_id = patient._id;
        }
        const appt = await Appointment.findOneAndUpdate(filter, { status: 'cancelled' });
        if (!appt) return res.status(404).json({ success: false, message: 'Appointment not found' });
        res.json({ success: true, message: 'Appointment cancelled' });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

module.exports = router;
