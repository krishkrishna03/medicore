const nodemailer = require('nodemailer');

// Configure via environment variables or .env
// EMAIL_HOST, EMAIL_PORT, EMAIL_USER, EMAIL_PASS, EMAIL_FROM
const transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.EMAIL_PORT) || 587,
    secure: false,
    auth: {
        user: process.env.EMAIL_USER || '',
        pass: process.env.EMAIL_PASS || '',
    },
    tls: { rejectUnauthorized: false },
});

async function sendDoctorWelcomeEmail({ name, email, password, specialization, department }) {
    // If no email credentials configured, log and skip gracefully
    if (!process.env.EMAIL_USER) {
        console.log(`📧 [Email skipped — no EMAIL_USER set] Doctor: ${name}, Email: ${email}, Password: ${password}`);
        return { skipped: true };
    }

    const mailOptions = {
        from: `"MediCore HMS" <${process.env.EMAIL_FROM || process.env.EMAIL_USER}>`,
        to: email,
        subject: '🏥 Welcome to MediCore — Your Doctor Account is Ready',
        html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8"/>
        <style>
          body { font-family: 'Segoe UI', Arial, sans-serif; background: #0f172a; margin: 0; padding: 0; }
          .wrapper { max-width: 560px; margin: 40px auto; background: #1e293b; border-radius: 16px; overflow: hidden; border: 1px solid #334155; }
          .header { background: linear-gradient(135deg, #3b82f6, #8b5cf6); padding: 36px 40px; text-align: center; }
          .header h1 { color: #fff; font-size: 24px; margin: 0; font-weight: 800; letter-spacing: -0.5px; }
          .header p { color: rgba(255,255,255,0.85); margin: 8px 0 0; font-size: 14px; }
          .body { padding: 36px 40px; }
          .greeting { color: #f1f5f9; font-size: 18px; font-weight: 700; margin-bottom: 12px; }
          .text { color: #94a3b8; font-size: 14px; line-height: 1.7; margin-bottom: 24px; }
          .cred-box { background: #0f172a; border: 1px solid #334155; border-radius: 12px; padding: 24px; margin: 24px 0; }
          .cred-box h3 { color: #3b82f6; font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; margin: 0 0 16px; }
          .cred-row { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #1e293b; }
          .cred-row:last-child { border-bottom: none; }
          .cred-label { color: #64748b; font-size: 12px; font-weight: 600; text-transform: uppercase; }
          .cred-value { color: #f1f5f9; font-size: 14px; font-weight: 700; font-family: 'Courier New', monospace; }
          .btn { display: block; width: fit-content; margin: 24px auto 0; background: linear-gradient(135deg, #3b82f6, #8b5cf6); color: #fff; text-decoration: none; padding: 14px 36px; border-radius: 8px; font-weight: 700; font-size: 15px; }
          .warning { background: rgba(245,158,11,0.1); border: 1px solid rgba(245,158,11,0.3); border-radius: 8px; padding: 14px 18px; margin-top: 20px; color: #fbbf24; font-size: 13px; line-height: 1.5; }
          .footer { background: #0f172a; padding: 20px 40px; text-align: center; color: #475569; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="wrapper">
          <div class="header">
            <h1>🏥 MediCore HMS</h1>
            <p>Hospital Management System</p>
          </div>
          <div class="body">
            <div class="greeting">Welcome, Dr. ${name}! 👋</div>
            <p class="text">
              Your doctor account has been created on <strong>MediCore Hospital Management System</strong>.
              You can now log in and start managing your appointments and patient records.
            </p>
            <div class="cred-box">
              <h3>🔐 Your Login Credentials</h3>
              <div class="cred-row">
                <span class="cred-label">Portal URL</span>
                <span class="cred-value">http://localhost:3000</span>
              </div>
              <div class="cred-row">
                <span class="cred-label">Email</span>
                <span class="cred-value">${email}</span>
              </div>
              <div class="cred-row">
                <span class="cred-label">Password</span>
                <span class="cred-value">${password}</span>
              </div>
              <div class="cred-row">
                <span class="cred-label">Specialization</span>
                <span class="cred-value">${specialization}</span>
              </div>
              ${department ? `<div class="cred-row">
                <span class="cred-label">Department</span>
                <span class="cred-value">${department}</span>
              </div>` : ''}
            </div>
            <div class="warning">
              ⚠ Please change your password after your first login for security purposes.
            </div>
            <a class="btn" href="http://localhost:3000">Login to Your Portal →</a>
          </div>
          <div class="footer">
            MediCore Hospital Management System &bull; This is an automated message, please do not reply.
          </div>
        </div>
      </body>
      </html>
    `,
    };

    await transporter.sendMail(mailOptions);
    console.log(`📧 Welcome email sent to ${email}`);
    return { sent: true };
}

async function sendContactEmail({ name, email, phone, subject, message }) {
    if (!process.env.EMAIL_USER) {
        console.log(`📧 [Contact form skipped] From: ${name} <${email}> — ${message}`);
        return { skipped: true };
    }
    const mailOptions = {
        from: `"MediCore HMS Contact" <${process.env.EMAIL_FROM || process.env.EMAIL_USER}>`,
        to: process.env.EMAIL_USER,
        replyTo: email,
        subject: `[MediCore Contact] ${subject || 'New enquiry'} — ${name}`,
        html: `
      <div style="font-family:Arial,sans-serif;max-width:560px;margin:auto;padding:24px;border:1px solid #e2e8f0;border-radius:12px;">
        <h2 style="color:#3b82f6;">New Contact Form Submission</h2>
        <table style="width:100%;border-collapse:collapse;">
          <tr><td style="padding:8px 0;color:#64748b;font-weight:600;width:120px;">Name:</td><td style="padding:8px 0;">${name}</td></tr>
          <tr><td style="padding:8px 0;color:#64748b;font-weight:600;">Email:</td><td style="padding:8px 0;"><a href="mailto:${email}">${email}</a></td></tr>
          <tr><td style="padding:8px 0;color:#64748b;font-weight:600;">Phone:</td><td style="padding:8px 0;">${phone || '—'}</td></tr>
          <tr><td style="padding:8px 0;color:#64748b;font-weight:600;">Subject:</td><td style="padding:8px 0;">${subject || '—'}</td></tr>
          <tr><td style="padding:8px 0;color:#64748b;font-weight:600;vertical-align:top;">Message:</td><td style="padding:8px 0;">${message}</td></tr>
        </table>
      </div>
    `,
    };
    await transporter.sendMail(mailOptions);
    return { sent: true };
}

module.exports = { sendDoctorWelcomeEmail, sendContactEmail };
