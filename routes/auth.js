const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { User, Doctor, Patient } = require('../database/models');
const { JWT_SECRET } = require('../middleware/auth');

const router = express.Router();

// ─── LOGIN (all roles) ──────────────────────────────────────────────────────
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        if (!email || !password)
            return res.status(400).json({ success: false, message: 'Email and password required' });

        // Find by email, allow is_active: true OR is_active not set (null/undefined)
        const user = await User.findOne({
            email: email.toLowerCase(),
            $or: [{ is_active: true }, { is_active: { $exists: false } }, { is_active: null }]
        });
        if (!user)
            return res.status(401).json({ success: false, message: 'Invalid credentials. No account found with this email.' });

        const isValid = await bcrypt.compare(password, user.password);
        if (!isValid)
            return res.status(401).json({ success: false, message: 'Invalid credentials. Incorrect password.' });

        let profile = null;
        if (user.role === 'doctor') profile = await Doctor.findOne({ user_id: user._id });
        if (user.role === 'patient') profile = await Patient.findOne({ user_id: user._id });

        const tokenPayload = {
            id: user._id,
            email: user.email,
            role: user.role,
            name: user.name,
            profileId: profile ? profile._id : null,
        };

        const token = jwt.sign(tokenPayload, JWT_SECRET, { expiresIn: '24h' });

        res.json({
            success: true, message: 'Login successful', token,
            user: { id: user._id, email: user.email, role: user.role, name: user.name, phone: user.phone, profileId: profile?._id || null },
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

// ─── PATIENT REGISTRATION ───────────────────────────────────────────────────
router.post('/register', async (req, res) => {
    try {
        const { name, email, password, phone, date_of_birth, gender, blood_group, address } = req.body;
        if (!name || !email || !password)
            return res.status(400).json({ success: false, message: 'Name, email and password required' });

        const existing = await User.findOne({ email: email.toLowerCase() });
        if (existing)
            return res.status(409).json({ success: false, message: 'Email already registered' });

        const hashed = await bcrypt.hash(password, 10);
        const user = await User.create({ email: email.toLowerCase(), password: hashed, role: 'patient', name, phone: phone || '' });
        const patient = await Patient.create({ user_id: user._id, date_of_birth, gender, blood_group, address });

        const token = jwt.sign(
            { id: user._id, email: user.email, role: 'patient', name, profileId: patient._id },
            JWT_SECRET,
            { expiresIn: '24h' }
        );

        res.status(201).json({
            success: true, message: 'Registration successful', token,
            user: { id: user._id, email: user.email, role: 'patient', name, phone, profileId: patient._id },
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

module.exports = router;
