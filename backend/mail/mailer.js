// ═══════════════════════════════════════════════════════════
// MAILER — Nodemailer + Gmail SMTP
// Email templates for the Smart Home app
// ═══════════════════════════════════════════════════════════

const nodemailer = require('nodemailer');

let transporter = null;

/**
 * Initialize the email transporter
 */
function initMailer() {
  const user = process.env.GMAIL_USER || process.env.MAIL_USER;
  const pass = process.env.GMAIL_APP_PASSWORD || process.env.MAIL_PASS;

  if (!user || !pass) {
    console.warn('⚠️  Gmail credentials not configured. Email features disabled.');
    console.warn('   Set GMAIL_USER/MAIL_USER and GMAIL_APP_PASSWORD/MAIL_PASS in your .env file.');
    return;
  }

  transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: { user, pass },
  });

  // Verify connection
  transporter.verify((err) => {
    if (err) {
      console.error('❌ Email transporter error:', err.message);
    } else {
      console.log('✅ Email transporter ready');
    }
  });
}

/**
 * Send verification email
 */
async function sendVerificationEmail(toEmail, name, token) {
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
  const verifyUrl = `${frontendUrl}/verify?token=${token}`;

  const html = `
    <div style="font-family: 'Inter', -apple-system, sans-serif; max-width: 600px; margin: 0 auto; background: #0f172a; color: #e2e8f0; border-radius: 16px; overflow: hidden;">
      <div style="background: linear-gradient(135deg, #0ea5e9, #6366f1); padding: 40px 30px; text-align: center;">
        <h1 style="margin: 0; font-size: 28px; color: white;">🏠 Smart Home</h1>
        <p style="margin: 8px 0 0; color: rgba(255,255,255,0.85); font-size: 14px;">Welcome to your smart living experience</p>
      </div>
      <div style="padding: 30px;">
        <h2 style="color: #f1f5f9; margin-top: 0;">Hi ${name}! 👋</h2>
        <p style="line-height: 1.6; color: #94a3b8;">Thank you for registering with Smart Home. Please verify your email address to activate your account.</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${verifyUrl}" style="display: inline-block; background: linear-gradient(135deg, #0ea5e9, #6366f1); color: white; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 600; font-size: 16px;">
            ✅ Verify Email Address
          </a>
        </div>
        <p style="color: #64748b; font-size: 13px;">This link expires in 24 hours. If you didn't create an account, you can safely ignore this email.</p>
      </div>
      <div style="background: #1e293b; padding: 20px 30px; text-align: center;">
        <p style="margin: 0; color: #475569; font-size: 12px;">© ${new Date().getFullYear()} Smart Home Management System</p>
      </div>
    </div>
  `;

  return sendMail(toEmail, '🏠 Verify your Smart Home account', html);
}

/**
 * Send welcome email after verification
 */
async function sendWelcomeEmail(toEmail, name) {
  const html = `
    <div style="font-family: 'Inter', -apple-system, sans-serif; max-width: 600px; margin: 0 auto; background: #0f172a; color: #e2e8f0; border-radius: 16px; overflow: hidden;">
      <div style="background: linear-gradient(135deg, #22c55e, #0ea5e9); padding: 40px 30px; text-align: center;">
        <h1 style="margin: 0; font-size: 28px; color: white;">🎉 Welcome Aboard!</h1>
      </div>
      <div style="padding: 30px;">
        <h2 style="color: #f1f5f9; margin-top: 0;">Hey ${name}!</h2>
        <p style="line-height: 1.6; color: #94a3b8;">Your email has been verified successfully. You can now log in and start setting up your smart home.</p>
        <h3 style="color: #f1f5f9;">Getting Started:</h3>
        <ol style="color: #94a3b8; line-height: 1.8;">
          <li>Log in to your account</li>
          <li>Create your house profile</li>
          <li>Add rooms and devices</li>
          <li>Connect your ESP32 boards</li>
          <li>Start controlling your home! 🏠</li>
        </ol>
      </div>
      <div style="background: #1e293b; padding: 20px 30px; text-align: center;">
        <p style="margin: 0; color: #475569; font-size: 12px;">© ${new Date().getFullYear()} Smart Home Management System</p>
      </div>
    </div>
  `;

  return sendMail(toEmail, '🎉 Welcome to Smart Home!', html);
}

/**
 * Send request status email (approved/rejected)
 */
async function sendRequestStatusEmail(toEmail, name, requestType, status, adminNote) {
  const isApproved = status === 'approved';
  const color = isApproved ? '#22c55e' : '#ef4444';
  const emoji = isApproved ? '✅' : '❌';
  const statusText = isApproved ? 'Approved' : 'Rejected';

  const html = `
    <div style="font-family: 'Inter', -apple-system, sans-serif; max-width: 600px; margin: 0 auto; background: #0f172a; color: #e2e8f0; border-radius: 16px; overflow: hidden;">
      <div style="background: linear-gradient(135deg, ${color}, #0ea5e9); padding: 40px 30px; text-align: center;">
        <h1 style="margin: 0; font-size: 28px; color: white;">${emoji} Request ${statusText}</h1>
      </div>
      <div style="padding: 30px;">
        <h2 style="color: #f1f5f9; margin-top: 0;">Hi ${name},</h2>
        <p style="line-height: 1.6; color: #94a3b8;">Your request for <strong style="color: #f1f5f9;">"${requestType}"</strong> has been <strong style="color: ${color};">${statusText.toLowerCase()}</strong>.</p>
        ${adminNote ? `<div style="background: #1e293b; border-left: 4px solid ${color}; padding: 15px; border-radius: 0 8px 8px 0; margin: 20px 0;">
          <p style="margin: 0; color: #94a3b8; font-size: 13px;">Admin Note:</p>
          <p style="margin: 8px 0 0; color: #e2e8f0;">${adminNote}</p>
        </div>` : ''}
      </div>
      <div style="background: #1e293b; padding: 20px 30px; text-align: center;">
        <p style="margin: 0; color: #475569; font-size: 12px;">© ${new Date().getFullYear()} Smart Home Management System</p>
      </div>
    </div>
  `;

  return sendMail(toEmail, `${emoji} Your request has been ${statusText.toLowerCase()}`, html);
}

/**
 * Send alert email (emergency notifications)
 */
async function sendAlertEmail(toEmail, name, title, message, alertType) {
  const colors = {
    warning: '#f59e0b',
    danger: '#ef4444',
    emergency: '#dc2626',
  };
  const color = colors[alertType] || colors.warning;

  const html = `
    <div style="font-family: 'Inter', -apple-system, sans-serif; max-width: 600px; margin: 0 auto; background: #0f172a; color: #e2e8f0; border-radius: 16px; overflow: hidden;">
      <div style="background: linear-gradient(135deg, ${color}, #991b1b); padding: 40px 30px; text-align: center;">
        <h1 style="margin: 0; font-size: 28px; color: white;">🚨 ${title}</h1>
      </div>
      <div style="padding: 30px;">
        <h2 style="color: #f1f5f9; margin-top: 0;">Attention ${name}!</h2>
        <div style="background: rgba(239, 68, 68, 0.1); border: 1px solid ${color}; border-radius: 8px; padding: 20px; margin: 20px 0;">
          <p style="margin: 0; color: #fca5a5; font-size: 16px; line-height: 1.6;">${message}</p>
        </div>
        <p style="color: #94a3b8;">Please check your Smart Home dashboard immediately and take appropriate action.</p>
      </div>
      <div style="background: #1e293b; padding: 20px 30px; text-align: center;">
        <p style="margin: 0; color: #475569; font-size: 12px;">© ${new Date().getFullYear()} Smart Home Management System</p>
      </div>
    </div>
  `;

  return sendMail(toEmail, `🚨 ALERT: ${title}`, html);
}

/**
 * Send broadcast email to all clients
 */
async function sendBroadcastEmail(emails, subject, content) {
  const html = `
    <div style="font-family: 'Inter', -apple-system, sans-serif; max-width: 600px; margin: 0 auto; background: #0f172a; color: #e2e8f0; border-radius: 16px; overflow: hidden;">
      <div style="background: linear-gradient(135deg, #0ea5e9, #6366f1); padding: 40px 30px; text-align: center;">
        <h1 style="margin: 0; font-size: 28px; color: white;">🏠 Smart Home</h1>
      </div>
      <div style="padding: 30px;">
        <div style="color: #e2e8f0; line-height: 1.7;">${content}</div>
      </div>
      <div style="background: #1e293b; padding: 20px 30px; text-align: center;">
        <p style="margin: 0; color: #475569; font-size: 12px;">© ${new Date().getFullYear()} Smart Home Management System</p>
      </div>
    </div>
  `;

  const results = [];
  for (const email of emails) {
    try {
      await sendMail(email, subject, html);
      results.push({ email, success: true });
    } catch (err) {
      results.push({ email, success: false, error: err.message });
    }
  }
  return results;
}

/**
 * Core send mail function
 */
async function sendMail(to, subject, html) {
  if (!transporter) {
    console.warn('⚠️  Email transporter not initialized. Skipping email to:', to);
    return { skipped: true, reason: 'Transporter not initialized' };
  }

  try {
    const fromAddress = process.env.MAIL_FROM || `"Smart Home" <${process.env.GMAIL_USER || process.env.MAIL_USER}>`;
    const info = await transporter.sendMail({
      from: fromAddress,
      to,
      subject,
      html,
    });
    console.log(`📧 Email sent to ${to}: ${info.messageId}`);
    return info;
  } catch (err) {
    console.error(`❌ Email send failed to ${to}:`, err.message);
    throw err;
  }
}

module.exports = {
  initMailer,
  sendVerificationEmail,
  sendWelcomeEmail,
  sendRequestStatusEmail,
  sendAlertEmail,
  sendBroadcastEmail,
  sendMail,
};
