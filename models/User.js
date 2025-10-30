import mongoose from "mongoose";
import bcrypt from "bcryptjs";

/**
 * 👤 User Schema (Production-Ready)
 * Includes strong validation, hashed passwords, and verification support.
 */
const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Name is required."],
      trim: true,
      minlength: [2, "Name must be at least 2 characters long."],
      maxlength: [100, "Name cannot exceed 100 characters."],
    },

    email: {
      type: String,
      required: [true, "Email is required."],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, "Invalid email format."],
      index: true,
    },

    password: {
      type: String,
      required: [true, "Password is required."],
      minlength: [6, "Password must be at least 6 characters long."],
      select: false, // ⛔ Prevent password from being returned in queries by default
    },

    phone: {
      type: String,
      trim: true,
      match: [/^[0-9]{10}$/, "Invalid phone number (must be 10 digits)."],
    },

    occupation: {
      type: String,
      trim: true,
      maxlength: [100, "Occupation cannot exceed 100 characters."],
    },

    source: {
      type: String,
      trim: true,
      maxlength: [100, "Source field cannot exceed 100 characters."],
    },

    emailVerified: {
      type: Boolean,
      default: false,
    },

    verifyToken: {
      type: String,
      select: false, // ⛔ Hide sensitive token info
    },

    verifyTokenExpires: {
      type: Date,
      select: false,
    },
  },
  {
    timestamps: true, // Automatically adds createdAt & updatedAt
    collection: "users",
    versionKey: false,
  }
);

//
// 🔐 Password Hash Middleware (runs before saving user)
//
userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  try {
    const salt = await bcrypt.genSalt(12); // Higher salt rounds for stronger security
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (err) {
    next(err);
  }
});

//
// 🔑 Password Comparison Method
//
userSchema.methods.comparePassword = async function (candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

//
// 🧠 Prevent re-compiling model in hot-reload (useful for dev mode)
//
const User = mongoose.models.User || mongoose.model("User", userSchema);

export default User;
