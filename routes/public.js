const express = require('express');
const { sendContactEmail } = require('../services/email');

const router = express.Router();

router.post('/contact', async (req, res) => {
    try {
        const { name, email, phone, subject, message } = req.body;
        if (!name || !email || !message)
            return res.status(400).json({ success: false, message: 'Name, email and message are required' });

        await sendContactEmail({ name, email, phone, subject, message });
        res.json({ success: true, message: 'Your message has been received. We will get back to you shortly!' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Failed to send message. Please try again.' });
    }
});

module.exports = router;
