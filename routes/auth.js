import express from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import dotenv from "dotenv";
import nodemailer from "nodemailer";
import cookieParser from "cookie-parser";
import User from "../models/User.js";

dotenv.config();
const router = express.Router();
router.use(cookieParser());

/* ================================
   ✉️ Nodemailer Transporter Setup
   ================================ */
const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com", // ✅ Explicit for production stability
  port: 465,
  secure: true,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

/* ================================
   📩 Email Template Generator
   ================================ */
function buildVerificationEmail(name, verifyUrl) {
  return `
  <div style="font-family:Inter,Arial,sans-serif;color:#0f172a">
    <h2>Welcome to Acceleott, ${name}!</h2>
    <p>Thanks for registering. Please confirm your email by clicking the button below:</p>
    <p style="margin:24px 0">
      <a href="${verifyUrl}" 
         style="background:#0ea5a5;color:#fff;padding:12px 18px;border-radius:8px;text-decoration:none;font-weight:600">
         Verify My Email
      </a>
    </p>
    <p>If the button doesn’t work, copy this link:</p>
    <p style="word-break:break-all">${verifyUrl}</p>
    <hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0">
    <small>If you didn’t create an account, you can ignore this email.</small>
  </div>`;
}

/* ================================
   🧾 Register User
   ================================ */
router.post("/register", async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password)
      return res.status(400).json({ message: "All fields are required." });

    const existingUser = await User.findOne({ email });
    if (existingUser)
      return res.status(400).json({ message: "User already exists." });

    const hashedPassword = await bcrypt.hash(password, 12);

    // Create user
    const user = new User({ name, email, password: hashedPassword });

    // Generate verification token
    const token = crypto.randomBytes(32).toString("hex");
    user.verifyToken = crypto.createHash("sha256").update(token).digest("hex");
    user.verifyTokenExpires = Date.now() + 24 * 60 * 60 * 1000; // 24h
    await user.save();

    // Build verification link
    const verifyUrl = `${process.env.API_BASE_URL}/api/auth/verify/${token}`;

    // Send verification email
    await transporter.sendMail({
      from: `"Acceleott" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: "Confirm your email — Acceleott",
      html: buildVerificationEmail(name, verifyUrl),
    });

    // Notify admin (optional)
    if (process.env.ADMIN_EMAIL) {
      await transporter.sendMail({
        from: `"Acceleott" <${process.env.EMAIL_USER}>`,
        to: process.env.ADMIN_EMAIL,
        subject: `🆕 New User Registered — ${name}`,
        html: `
          <h3>New User Registration</h3>
          <ul>
            <li><strong>Name:</strong> ${name}</li>
            <li><strong>Email:</strong> ${email}</li>
            <li><strong>Time:</strong> ${new Date().toLocaleString()}</li>
          </ul>
        `,
      });
    }

    res.status(201).json({
      success: true,
      message: "User registered successfully. Please check your email to verify your account.",
    });
  } catch (err) {
    console.error("❌ Registration Error:", err);
    res.status(500).json({ message: "Server error during registration." });
  }
});

/* ================================
   ✅ Verify Email
   ================================ */
router.get("/verify/:token", async (req, res) => {
  try {
    const { token } = req.params;
    const hashedToken = crypto.createHash("sha256").update(token).digest("hex");

    const user = await User.findOne({
      verifyToken: hashedToken,
      verifyTokenExpires: { $gt: Date.now() },
    });

    if (!user) return res.redirect(`${process.env.APP_BASE_URL}/verify-failed`);

    user.emailVerified = true;
    user.verifyToken = undefined;
    user.verifyTokenExpires = undefined;
    await user.save();

    res.redirect(`${process.env.APP_BASE_URL}/verify-success`);
  } catch (err) {
    console.error("❌ Verification Error:", err);
    res.redirect(`${process.env.APP_BASE_URL}/verify-failed`);
  }
});

/* ================================
   🔐 Login User
   ================================ */
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email }).select("+password");
    if (!user)
      return res.status(400).json({ message: "Invalid credentials." });

    if (!user.emailVerified)
      return res.status(403).json({ message: "Please verify your email first." });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch)
      return res.status(400).json({ message: "Invalid credentials." });

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
      expiresIn: "1d",
    });

    res.cookie("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 24 * 60 * 60 * 1000, // 1 day
    });

    res.json({
      success: true,
      message: "Login successful.",
      user: { id: user._id, name: user.name, email: user.email },
    });
  } catch (err) {
    console.error("❌ Login Error:", err);
    res.status(500).json({ message: "Server error during login." });
  }
});

/* ================================
   🚪 Logout
   ================================ */
router.post("/logout", (req, res) => {
  res.clearCookie("token", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
  });
  res.json({ success: true, message: "Logged out successfully." });
});

/* ================================
   👤 Get Logged-in User
   ================================ */
router.get("/me", async (req, res) => {
  try {
    const token = req.cookies.token;
    if (!token) return res.status(401).json({ message: "Not authorized." });

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id).select("-password");
    if (!user)
      return res.status(404).json({ message: "User not found." });

    res.json({ success: true, user });
  } catch (err) {
    console.error("❌ GetMe Error:", err);
    res.status(401).json({ message: "Invalid or expired token." });
  }
});

export default router;
