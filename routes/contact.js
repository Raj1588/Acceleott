/**
 * ===========================
 * Contact Routes
 * ===========================
 * Handles contact form submissions.
 * Delegates logic to the controller for clean separation of concerns.
 */

import express from "express";
import { sendMessage } from "../controllers/contactController.js";

const router = express.Router();

/**
 * @route   POST /api/contact
 * @desc    Receive contact form submission and trigger email/DB action
 * @access  Public
 */
router.post("/", sendMessage);

// Graceful handling for unsupported methods
router.all("/", (req, res) => {
  res.status(405).json({ error: `Method ${req.method} not allowed` });
});

export default router;
