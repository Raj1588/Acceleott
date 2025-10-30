/**
 * ==========================================
 * Demo Request Routes (POST /api/demo)
 * ==========================================
 * Saves demo requests to MongoDB and sends an
 * email notification to the admin.
 */

import express from "express";
import dotenv from "dotenv";
import nodemailer from "nodemailer";
import DemoRequest from "../models/DemoRequest.js";

dotenv.config();
const router = express.Router();

/**
 * ===========================
 * Nodemailer Transporter Setup
 * ===========================
 * Uses Gmail SMTP via App Password.
 */
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER, // e.g. yourcompany@gmail.com
    pass: process.env.EMAIL_PASS, // Gmail App Password
  },
});

/**
 * @route   POST /api/demo
 * @desc    Store demo request and notify admin
 * @access  Public
 */
router.post("/", async (req, res) => {
  try {
    const { name, email, contact, designation } = req.body;

    // --- Validation ---
    if (!name?.trim() || !email?.trim() || !contact?.trim()) {
      return res.status(400).json({
        message: "Name, email, and contact fields are required.",
      });
    }

    // --- Save to MongoDB ---
    const demoRequest = await DemoRequest.create({
      name,
      email,
      contact,
      designation,
    });

    // --- Send Admin Notification ---
    const adminEmail = process.env.ADMIN_EMAIL;
    if (adminEmail) {
      await transporter.sendMail({
        from: `"Acceleott Automations" <${process.env.EMAIL_USER}>`,
        to: adminEmail,
        subject: `🧩 New Demo Request — ${name}`,
        html: `
          <div style="font-family:Inter,Arial,sans-serif;color:#0f172a">
            <h2>New Demo Request Received</h2>
            <p><strong>Name:</strong> ${name}</p>
            <p><strong>Email:</strong> ${email}</p>
            <p><strong>Contact:</strong> ${contact}</p>
            <p><strong>Designation:</strong> ${designation || "N/A"}</p>
            <p><strong>Received At:</strong> ${new Date().toLocaleString()}</p>
          </div>
        `,
      });
    }

    console.log("✅ Demo request stored & admin notified.");

    return res
      .status(201)
      .json({ message: "Demo request submitted successfully." });
  } catch (err) {
    console.error("❌ Demo Request Error:", err.message || err);
    return res.status(500).json({
      message: "Server error while submitting the demo request. Please try again.",
    });
  }
});

/**
 * Catch-all for unsupported HTTP methods
 */
router.all("/", (req, res) => {
  res.status(405).json({ error: `Method ${req.method} not allowed` });
});

export default router;
