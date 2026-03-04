const express = require('express');
const { Patient, Billing, Appointment } = require('../database/models');
const { authenticateToken, requireRole } = require('../middleware/auth');

const router = express.Router();
router.use(authenticateToken);

// ─── ALL BILLS (admin) ────────────────────────────────────────────────────────
router.get('/', requireRole('admin'), async (req, res) => {
    try {
        const bills = await Billing.find()
            .sort({ createdAt: -1 })
            .populate({ path: 'patient_id', populate: { path: 'user_id', select: 'name' } })
            .populate({
                path: 'appointment_id', select: 'appointment_date doctor_id',
                populate: { path: 'doctor_id', populate: { path: 'user_id', select: 'name' } },
            });

        const allBills = await Billing.find({}, 'amount status');
        const paid = allBills.filter(b => b.status === 'paid').reduce((s, b) => s + b.amount, 0);
        const unpaid = allBills.filter(b => b.status === 'unpaid').reduce((s, b) => s + b.amount, 0);

        const data = bills.map(b => ({
            id: b._id,
            patient_name: b.patient_id?.user_id?.name || '—',
            doctor_name: b.appointment_id?.doctor_id?.user_id?.name || '—',
            description: b.description,
            amount: b.amount,
            status: b.status,
            payment_method: b.payment_method,
            payment_date: b.payment_date,
            created_at: b.createdAt,
        }));

        res.json({ success: true, data, stats: { paid, unpaid } });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

// ─── CREATE BILL (admin) ───────────────────────────────────────────────────────
router.post('/', requireRole('admin'), async (req, res) => {
    try {
        const { patient_id, amount, description, appointment_id } = req.body;
        if (!patient_id || !amount)
            return res.status(400).json({ success: false, message: 'Patient and amount required' });

        const bill = await Billing.create({
            patient_id, appointment_id: appointment_id || null,
            amount, description: description || 'Hospital Services', status: 'unpaid',
        });

        res.status(201).json({ success: true, message: 'Bill created', data: { id: bill._id } });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

// ─── UPDATE BILL (admin) ───────────────────────────────────────────────────────
router.put('/:id', requireRole('admin'), async (req, res) => {
    try {
        const { status, payment_method } = req.body;
        const update = { status, payment_method };
        if (status === 'paid') update.payment_date = new Date().toISOString().split('T')[0];
        await Billing.findByIdAndUpdate(req.params.id, update);
        res.json({ success: true, message: 'Bill updated' });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

module.exports = router;
