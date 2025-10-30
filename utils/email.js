/**
 * ==========================================
 * Email Utility (backend/utils/email.js)
 * ==========================================
 * Centralized email sending module for the backend.
 * Uses Nodemailer with Gmail SMTP (App Password).
 */

import nodemailer from "nodemailer";

// ============================
// Transporter Setup
// ============================
// Use Gmail or another SMTP provider.
// App password required for Gmail accounts.
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER, // e.g. support@yourdomain.com
    pass: process.env.EMAIL_PASS, // Gmail App Password (not normal password)
  },
});

/**
 * ============================
 * Send Email Utility Function
 * ============================
 * @param {Object} options
 * @param {string} options.to - Recipient email address.
 * @param {string} options.subject - Email subject line.
 * @param {string} [options.text] - Plaintext fallback.
 * @param {string} [options.html] - HTML email body (preferred).
 */
export const sendEmail = async ({ to, subject, text = "", html = "" }) => {
  try {
    if (!to || !subject) {
      throw new Error("Missing required fields: 'to' and 'subject'");
    }

    await transporter.sendMail({
      from: `"Acceleott Website" <${process.env.EMAIL_USER}>`,
      to,
      subject,
      text: text || "No text content provided.",
      html,
    });

    console.log(`✅ Email sent successfully to ${to}`);
  } catch (err) {
    console.error("❌ Email sending failed:", err.message || err);
  }
};

/**
 * ============================
 * Transporter Health Check (Optional)
 * ============================
 * Useful during startup to ensure SMTP connection is valid.
 */
export const verifyEmailConnection = async () => {
  try {
    await transporter.verify();
    console.log("📧 SMTP connection verified successfully.");
  } catch (err) {
    console.error("⚠️ SMTP connection verification failed:", err.message);
  }
};
