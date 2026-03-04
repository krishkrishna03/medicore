const express = require('express');
const { Medicine } = require('../database/models');
const { authenticateToken, requireRole } = require('../middleware/auth');

const router = express.Router();
router.use(authenticateToken);

// ─── GET ALL MEDICINES ────────────────────────────────────────────────────────
router.get('/', async (req, res) => {
    try {
        const { search, category } = req.query;
        const filter = {};
        if (search) filter.$or = [{ name: { $regex: search, $options: 'i' } }, { generic_name: { $regex: search, $options: 'i' } }];
        if (category) filter.category = category;
        const medicines = await Medicine.find(filter).sort({ name: 1 });
        res.json({ success: true, data: medicines });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

// ─── GET CATEGORIES ───────────────────────────────────────────────────────────
router.get('/categories', async (req, res) => {
    try {
        const cats = await Medicine.distinct('category', { category: { $ne: '' } });
        res.json({ success: true, data: cats.sort() });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

// ─── ADD MEDICINE (admin) ──────────────────────────────────────────────────────
router.post('/', requireRole('admin'), async (req, res) => {
    try {
        const { name, generic_name, category, quantity, unit, price, manufacturer, expiry_date } = req.body;
        if (!name) return res.status(400).json({ success: false, message: 'Medicine name required' });
        const med = await Medicine.create({ name, generic_name, category, quantity: quantity || 0, unit: unit || 'tablet', price: price || 0, manufacturer, expiry_date });
        res.status(201).json({ success: true, message: 'Medicine added', data: { id: med._id } });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

// ─── UPDATE MEDICINE (admin) ───────────────────────────────────────────────────
router.put('/:id', requireRole('admin'), async (req, res) => {
    try {
        const { name, generic_name, category, quantity, unit, price, manufacturer, expiry_date } = req.body;
        await Medicine.findByIdAndUpdate(req.params.id, { name, generic_name, category, quantity, unit, price, manufacturer, expiry_date });
        res.json({ success: true, message: 'Medicine updated' });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

// ─── DELETE MEDICINE (admin) ───────────────────────────────────────────────────
router.delete('/:id', requireRole('admin'), async (req, res) => {
    try {
        await Medicine.findByIdAndDelete(req.params.id);
        res.json({ success: true, message: 'Medicine deleted' });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

// ─── RESTOCK (admin) ──────────────────────────────────────────────────────────
router.put('/:id/restock', requireRole('admin'), async (req, res) => {
    try {
        const { quantity } = req.body;
        const id = req.params.id;
        if (!id) return res.status(400).json({ success: false, message: 'Medicine ID required' });
        if (quantity === undefined || quantity === null || isNaN(quantity)) {
            return res.status(400).json({ success: false, message: 'Valid quantity required' });
        }
        // optional: ensure id is valid ObjectId
        const mongoose = require('mongoose');
        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ success: false, message: 'Invalid medicine ID' });
        }
        await Medicine.findByIdAndUpdate(id, { $inc: { quantity: +quantity } });
        res.json({ success: true, message: 'Stock updated' });
    } catch (err) {
        console.error('Restock error:', err);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

module.exports = router;
