/**
 * ============================================================
 *  Acceleott Fullstack Server (Backend + Frontend on Vercel)
 * ============================================================
 * ✅ Unified server for API and static asset serving (e.g., Vercel deployment).
 * ✅ Handles MongoDB connection and JWT/Nodemailer logic.
 * ============================================================
 */

import express from "express";
import dotenv from "dotenv";
import mongoose from "mongoose";
import cookieParser from "cookie-parser";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import nodemailer from "nodemailer";

// --- Import Routes (Ensure these file paths are correct in your project) ---
import authRoutes from "./routes/auth.js";
import demoRoutes from "./routes/demoRoutes.js";

// ================================
// 1. Setup and Environment
// ================================
dotenv.config();

const isVercel = !!process.env.VERCEL;
const isProduction = process.env.NODE_ENV === "production" || isVercel;

// Path setup for static assets
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
// Adjust this path based on where your frontend 'dist' folder lands relative to this file.
// This assumes server.js is in 'backend/' or 'api/' and 'dist' is at the project root.
const FE_DIST_PATH = path.join(__dirname, '..', '..', 'dist'); 

// ================================
// 2. MongoDB Connection
// ================================
const mongoURI = process.env.MONGODB_URI;

if (!mongoURI) {
    console.error("❌ MONGODB_URI is missing. Server cannot start.");
    if (!isVercel) process.exit(1); // Only exit locally
} else {
    mongoose
      .connect(mongoURI)
      .then(() => console.log("✅ MongoDB connected successfully"))
      .catch((err) => {
        console.error("❌ MongoDB connection failed:", err.message);
        if (!isVercel) process.exit(1);
      });
}


// ================================
// 3. Express App Setup & Middleware
// ================================
const app = express();
const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:5173";

app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// CORS Configuration (Crucial for local dev to communicate with Vite/React)
if (!isProduction) {
  app.use(
    cors({
      origin: FRONTEND_URL,
      credentials: true,
      methods: ["GET", "POST", "PUT", "DELETE"],
    })
  );
}

// ================================
// 4. Backend API Routes
// ================================
app.use("/api/auth", authRoutes);
app.use("/api/demo", demoRoutes);

// Test email route (For debugging connection)
app.post("/api/test-email", async (req, res) => {
  const { to, subject, text } = req.body;
  if (!to || !subject || !text)
    return res.status(400).json({ message: "❌ Missing email fields" });

  try {
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    await transporter.sendMail({
      from: process.env.EMAIL_FROM || process.env.EMAIL_USER,
      to,
      subject,
      text,
    });

    res.status(200).json({ message: "✅ Test email sent successfully" });
  } catch (err) {
    console.error("❌ Email sending failed:", err.message);
    res.status(500).json({ message: "Internal server error while sending email." });
  }
});


// ================================
// 5. Serve Frontend (Static Assets)
// ================================
if (isProduction) {
    console.log(`Serving static files from: ${FE_DIST_PATH}`);

    // Serve static files from the frontend build folder
    app.use(express.static(FE_DIST_PATH));

    // Fallback route: serve index.html for all non-API GET requests
    app.get("*", (req, res) => {
        // If the request path is not an API path, serve index.html
        if (!req.originalUrl.startsWith("/api")) {
             return res.sendFile(path.join(FE_DIST_PATH, "index.html"));
        }
        res.status(404).json({ message: "API endpoint not found" });
    });
} else {
    // Local dev: Sanity check for the root route
    app.get("/", (req, res) => res.send(`Acceleott API is running locally (Frontend served by Vite at ${FRONTEND_URL})`));
}

// ================================
// 6. Error Handling
// ================================
app.use((err, req, res, next) => {
  console.error("Server Error:", err.stack);
  res.status(500).json({ message: "Internal Server Error." });
});

// ================================
// 7. Start Server (Local Only) & Vercel Export
// ================================
const PORT = process.env.PORT || 5000;
if (!isVercel) {
  app.listen(PORT, () => {
    console.log(`🚀 Server running locally at http://localhost:${PORT}`);
    console.log(`Frontend URL: ${FRONTEND_URL}`);
  });
}

// Vercel requires the app to be exported for the serverless function
export default app;