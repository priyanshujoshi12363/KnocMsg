import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config(); // load .env automatically

const connectDB = async () => {
  try {
    const connection = await mongoose.connect(process.env.MONGO_DB_URL, {
      dbName: "knocmsg"
    });

    console.log(`🔥 MongoDB connected: ${connection.connection.host}`);
  } catch (error) {
    console.error("❌ mongodb connection error:", error.message);
    process.exit(1);
  }
};

export default connectDB;
