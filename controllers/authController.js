import User from "../models/User.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import nodemailer from "nodemailer";

/* -------------------------------
   EMAIL TRANSPORT CONFIGURATION
--------------------------------*/
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
  tls: {
    rejectUnauthorized: true, // Reject invalid certs (production safe)
  },
});

/* -------------------------------
   VERIFY TRANSPORTER CONNECTION
--------------------------------*/
transporter.verify((error, success) => {
  if (error) {
    console.error("❌ Email transporter failed:", error.message);
  } else {
    console.log("📨 Email transporter ready.");
  }
});

/* -------------------------------
   BUILD VERIFICATION EMAIL TEMPLATE
--------------------------------*/
const buildVerificationEmail = (name, verifyUrl) => `
  <div style="font-family:Inter,Arial,sans-serif;color:#0f172a">
    <h2>Welcome to Acceleott, ${name}!</h2>
    <p>Thanks for registering. Please confirm your email by clicking the button below.</p>
    <p style="margin:24px 0">
      <a href="${verifyUrl}" 
         style="background:#0ea5a5;color:#fff;padding:12px 18px;border-radius:8px;
                text-decoration:none;font-weight:600">
        Verify my email
      </a>
    </p>
    <p>If the button doesn’t work, copy this link:</p>
    <p style="word-break:break-all">${verifyUrl}</p>
    <hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0">
    <small>If you didn’t create an account, you can ignore this email.</small>
  </div>
`;

/* -------------------------------
   REGISTER USER
--------------------------------*/
export const registerUser = async (req, res) => {
  try {
    const { name, email, password, phone, occupation, source } = req.body;

    if (!name || !email || !password)
      return res.status(400).json({ message: "Name, email, and password are required." });

    const existing = await User.findOne({ email: email.toLowerCase().trim() });
    if (existing) return res.status(400).json({ message: "User already exists." });

    const salt = await bcrypt.genSalt(12);
    const hashed = await bcrypt.hash(password, salt);

    const user = await User.create({
      name: name.trim(),
      email: email.toLowerCase().trim(),
      password: hashed,
      phone,
      occupation,
      source,
      emailVerified: false,
    });

    const rawToken = crypto.randomBytes(32).toString("hex");
    const hashedToken = crypto.createHash("sha256").update(rawToken).digest("hex");

    user.verifyToken = hashedToken;
    user.verifyTokenExpires = Date.now() + 24 * 60 * 60 * 1000;
    await user.save();

    const verifyUrl =
      `${process.env.FRONTEND_URL || process.env.APP_BASE_URL || "http://localhost:5173"}/verify/${rawToken}`;

    // Send verification email
    transporter.sendMail({
      from: process.env.EMAIL_FROM || process.env.EMAIL_USER,
      to: user.email,
      subject: "Confirm your email — Acceleott",
      html: buildVerificationEmail(user.name, verifyUrl),
    }).catch(err => console.error("❌ Failed to send verification email:", err.message));

    // Optional: notify admin
    if (process.env.ADMIN_EMAIL) {
      transporter.sendMail({
        from: process.env.EMAIL_FROM || process.env.EMAIL_USER,
        to: process.env.ADMIN_EMAIL,
        subject: `New User Registered — ${user.name}`,
        html: `
          <p>A new user registered on Acceleott:</p>
          <ul>
            <li><strong>Name:</strong> ${user.name}</li>
            <li><strong>Email:</strong> ${user.email}</li>
            <li><strong>Registered:</strong> ${new Date().toLocaleString()}</li>
          </ul>
        `,
      }).catch(err => console.error("⚠️ Admin email failed:", err.message));
    }

    return res.status(201).json({
      message: "User registered. Please check your email to verify your account.",
    });
  } catch (err) {
    console.error("Register error:", err.message);
    if (err.code === 11000 && err.keyPattern?.email)
      return res.status(400).json({ message: "Email already registered." });
    return res.status(500).json({ message: "Server error during registration." });
  }
};

/* -------------------------------
   VERIFY EMAIL
--------------------------------*/
export const verifyEmail = async (req, res) => {
  try {
    const { token } = req.params;
    if (!token) return res.status(400).send("Invalid verification token.");

    const hashed = crypto.createHash("sha256").update(token).digest("hex");

    const user = await User.findOne({
      verifyToken: hashed,
      verifyTokenExpires: { $gt: Date.now() },
    });

    if (!user) return res.status(400).send("Invalid or expired verification link.");

    user.emailVerified = true;
    user.verifyToken = undefined;
    user.verifyTokenExpires = undefined;
    await user.save();

    const successRedirect = `${process.env.FRONTEND_URL || "http://localhost:5173"}/verify-success`;
    return res.redirect(successRedirect);
  } catch (err) {
    console.error("Verify error:", err.message);
    return res.status(500).send("Server error during verification.");
  }
};

/* -------------------------------
   RESEND VERIFICATION EMAIL
--------------------------------*/
export const resendVerification = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ message: "Email is required." });

    const user = await User.findOne({ email: email.toLowerCase().trim() });
    if (!user) return res.status(404).json({ message: "User not found." });
    if (user.emailVerified)
      return res.status(200).json({ message: "Email already verified." });

    const rawToken = crypto.randomBytes(32).toString("hex");
    user.verifyToken = crypto.createHash("sha256").update(rawToken).digest("hex");
    user.verifyTokenExpires = Date.now() + 24 * 60 * 60 * 1000;
    await user.save();

    const verifyUrl =
      `${process.env.FRONTEND_URL || "http://localhost:5173"}/verify/${rawToken}`;

    await transporter.sendMail({
      from: process.env.EMAIL_FROM || process.env.EMAIL_USER,
      to: user.email,
      subject: "Verify your email — Acceleott",
      html: buildVerificationEmail(user.name, verifyUrl),
    });

    return res.json({ message: "Verification email resent successfully." });
  } catch (err) {
    console.error("Resend verification error:", err.message);
    return res.status(500).json({ message: "Server error during resend." });
  }
};

/* -------------------------------
   LOGIN USER
--------------------------------*/
export const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password)
      return res.status(400).json({ message: "Email and password required." });

    const user = await User.findOne({ email: email.toLowerCase().trim() });
    if (!user) return res.status(400).json({ message: "Invalid credentials." });

    if (!user.emailVerified)
      return res.status(403).json({ message: "Please verify your email to continue." });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ message: "Invalid credentials." });

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: "1d" });

    res.cookie("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 24 * 60 * 60 * 1000,
    });

    return res.json({
      message: "Login successful.",
      user: { id: user._id, name: user.name, email: user.email },
    });
  } catch (err) {
    console.error("Login error:", err.message);
    return res.status(500).json({ message: "Server error during login." });
  }
};

/* -------------------------------
   LOGOUT USER
--------------------------------*/
export const logoutUser = (req, res) => {
  res.clearCookie("token", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
  });
  return res.json({ message: "Logged out successfully." });
};

/* -------------------------------
   GET CURRENT USER
--------------------------------*/
export const getMe = async (req, res) => {
  try {
    const token = req.cookies?.token;
    if (!token) return res.status(401).json({ message: "Not authorized." });

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id)
      .select("-password -verifyToken -verifyTokenExpires");

    if (!user) return res.status(404).json({ message: "User not found." });

    return res.json(user);
  } catch (err) {
    console.error("GetMe error:", err.message);
    return res.status(500).json({ message: "Server error." });
  }
};
