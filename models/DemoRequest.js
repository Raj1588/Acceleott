import mongoose from "mongoose";

/**
 * 🧠 Demo Request Schema
 * Stores information submitted through the “Book Demo” form.
 * Includes full validation, indexing, and optimized schema settings.
 */
const DemoRequestSchema = new mongoose.Schema(
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
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, "Invalid email format."],
      index: true,
    },
    contact: {
      type: String,
      required: [true, "Contact number is required."],
      trim: true,
      match: [/^[0-9]{10}$/, "Invalid contact number (must be 10 digits)."],
    },
    designation: {
      type: String,
      trim: true,
      maxlength: [100, "Designation cannot exceed 100 characters."],
      default: "N/A",
    },
  },
  {
    timestamps: true, // Adds createdAt & updatedAt
    collection: "demoRequests",
    versionKey: false, // Removes __v field
  }
);

// ✅ Optional: Compound index for search optimization
DemoRequestSchema.index({ email: 1, contact: 1 });

// ✅ Optional: Virtual field for formatted date (useful in dashboards)
DemoRequestSchema.virtual("requestedOn").get(function () {
  return this.createdAt.toLocaleString();
});

// ✅ Prevent recompiling model in dev/hot-reload environments
const DemoRequest =
  mongoose.models.DemoRequest ||
  mongoose.model("DemoRequest", DemoRequestSchema);

export default DemoRequest;
