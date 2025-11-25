import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import http from "http";
import { Server } from "socket.io";
import pkg from 'agora-access-token';
const { RtcTokenBuilder, RtcRole } = pkg;
import connectDB from "./src/db/index.js";
import UserRouter from "./src/routers/UserRouter.js";
import msgRouters from './src/routers/msgRouters.js'

dotenv.config();

const app = express();
const port = process.env.PORT || 5000;

// Middlewares
app.use(cors());
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

// Routes
app.use("/user", UserRouter);
app.use("/msg" , msgRouters);

// 🔑 AGORA TOKEN GENERATION ENDPOINT
app.get("/agora-token", (req, res) => {
  try {
    const { channelName, uid } = req.query;
    
    if (!channelName) {
      return res.status(400).json({ error: "Channel name is required" });
    }

    // 🔐 AGORA CONFIG
    const APP_ID = "d4f5a6171178467e80e458648bd25cd3";
    const APP_CERTIFICATE = process.env.AGORA_APP_CERTIFICATE;

    // If no App Certificate, return helpful error
    if (!APP_CERTIFICATE) {
      return res.status(500).json({ 
        success: false,
        error: "Agora App Certificate not configured",
        message: "Please add AGORA_APP_CERTIFICATE to your environment variables."
      });
    }

    // Set token expiration time (1 hour)
    const expirationTimeInSeconds = 3600;
    const currentTimestamp = Math.floor(Date.now() / 1000);
    const privilegeExpiredTs = currentTimestamp + expirationTimeInSeconds;

    // Use 0 as UID if not provided
    const userId = uid ? parseInt(uid) : 0;

    // 🔑 GENERATE TOKEN
    const token = RtcTokenBuilder.buildTokenWithUid(
      APP_ID,
      APP_CERTIFICATE,
      channelName,
      userId,
      RtcRole.PUBLISHER,
      privilegeExpiredTs
    );

    console.log(`✅ Generated token for channel: ${channelName}`);
    
    res.json({
      success: true,
      token: token,
      appId: APP_ID,
      channel: channelName,
      uid: userId,
      expiresIn: expirationTimeInSeconds
    });

  } catch (error) {
    console.error("❌ Token generation error:", error);
    res.status(500).json({ 
      success: false,
      error: "Failed to generate token",
      message: error.message 
    });
  }
});

// Test endpoint to verify Agora config
app.get("/agora-config", (req, res) => {
  const APP_CERTIFICATE = process.env.AGORA_APP_CERTIFICATE;
  
  res.json({
    hasAppCertificate: !!APP_CERTIFICATE,
    appId: "d4f5a6171178467e80e458648bd25cd3",
    certificateLength: APP_CERTIFICATE ? APP_CERTIFICATE.length : 0,
    message: APP_CERTIFICATE ? "Ready for calls!" : "Missing App Certificate"
  });
});

// Create HTTP server (required for socket.io)
const server = http.createServer(app);

// Create socket server
const io = new Server(server, {
  cors: {
    origin: "*",
  },
});

let onlineUsers = {};

global.io = io;
global.onlineUsers = onlineUsers;

io.on("connection", (socket) => {
  console.log("🟢 User Connected:", socket.id);

  // ----------------- JOIN -----------------
  socket.on("join", (userId) => {
    onlineUsers[userId] = socket.id;
    console.log("User Joined:", userId, "Socket:", socket.id);
  });

  // ----------------- DISCONNECT -----------------
  socket.on("disconnect", () => {
    console.log("🔴 User Disconnected:", socket.id);
    for (let id in onlineUsers) {
      if (onlineUsers[id] === socket.id) {
        delete onlineUsers[id];
      }
    }
  });

  // ----------------- AGORA CALL SIGNALING -----------------
  socket.on("startCall", ({ toUserId, channelName, callType, fromUserId }) => {
    const receiverSocketId = onlineUsers[toUserId];
    if (receiverSocketId) {
      io.to(receiverSocketId).emit("incomingCall", { 
        channelName, 
        callType, 
        fromUserId 
      });
      console.log(`📞 Call initiated to ${toUserId}, channel: ${channelName}, type: ${callType}`);
    } else {
      socket.emit("userOffline", { toUserId });
    }
  });

  socket.on("endCall", ({ toUserId }) => {
    const receiverSocketId = onlineUsers[toUserId];
    if (receiverSocketId) {
      io.to(receiverSocketId).emit("callEnded");
      console.log(`📞 Call ended to ${toUserId}`);
    }
  });

  socket.on("rejectCall", ({ toUserId }) => {
    const callerSocketId = onlineUsers[toUserId];
    if (callerSocketId) {
      io.to(callerSocketId).emit("callRejected");
      console.log(`📞 Call rejected by user, notifying ${toUserId}`);
    }
  });

  socket.on("cancelCall", ({ toUserId }) => {
    const receiverSocketId = onlineUsers[toUserId];
    if (receiverSocketId) {
      io.to(receiverSocketId).emit("callCancelled");
      console.log(`📞 Call cancelled to ${toUserId}`);
    }
  });
});

connectDB()
  .then(() => {
    server.listen(port, "0.0.0.0", () => {
      console.log(`🚀 Server + Socket running at ${port}`);
    });
  })
  .catch((error) => {
    console.error("❌ DB Connection error:", error);
  });