import jwt from "jsonwebtoken";

/**
 * 🔒 Auth Middleware (Production Ready)
 * - Validates JWT token from Authorization header
 * - Attaches decoded user info to req.user
 * - Returns appropriate error responses with clear messages
 */
export default function authMiddleware(req, res, next) {
  try {
    // --- Extract Token ---
    const authHeader = req.header("Authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        success: false,
        message: "Access denied. No token provided.",
      });
    }

    const token = authHeader.split(" ")[1];

    // --- Verify Token ---
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    if (!decoded) {
      return res.status(401).json({
        success: false,
        message: "Invalid or expired token.",
      });
    }

    // --- Attach User Payload to Request ---
    req.user = decoded;

    // --- Continue to Next Middleware/Route ---
    next();
  } catch (err) {
    console.error("❌ JWT Verification Error:", err.message);

    // --- Handle Specific JWT Errors Gracefully ---
    if (err.name === "TokenExpiredError") {
      return res.status(401).json({
        success: false,
        message: "Session expired. Please log in again.",
      });
    }

    if (err.name === "JsonWebTokenError") {
      return res.status(401).json({
        success: false,
        message: "Invalid token signature.",
      });
    }

    return res.status(500).json({
      success: false,
      message: "Internal server error during authentication.",
    });
  }
}
