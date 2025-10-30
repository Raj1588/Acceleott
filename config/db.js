import mongoose from "mongoose";

const connectDB = async () => {
  const mongoURI = process.env.MONGO_URI;

  if (!mongoURI) {
    console.error("❌ MONGO_URI not found in environment variables.");
    process.exit(1);
  }

  mongoose.set("strictQuery", true); // Recommended for Mongoose 7+
  mongoose.set("autoIndex", false); // Disable auto index build in production

  const connectWithRetry = async (retries = 5, delay = 5000) => {
    try {
      const conn = await mongoose.connect(mongoURI, {
        useNewUrlParser: true,
        useUnifiedTopology: true,
        serverSelectionTimeoutMS: 10000, // fail faster on bad connections
      });

      console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
    } catch (err) {
      console.error(`❌ MongoDB connection failed: ${err.message}`);

      if (retries > 0) {
        console.log(`🔁 Retrying in ${delay / 1000} seconds... (${retries} retries left)`);
        setTimeout(() => connectWithRetry(retries - 1, delay), delay);
      } else {
        console.error("🚨 Could not connect to MongoDB after multiple attempts. Exiting...");
        process.exit(1);
      }
    }
  };

  await connectWithRetry();

  // Graceful shutdown
  process.on("SIGINT", async () => {
    await mongoose.connection.close();
    console.log("🛑 MongoDB connection closed due to app termination.");
    process.exit(0);
  });
};

export default connectDB;
