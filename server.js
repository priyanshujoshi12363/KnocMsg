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
import GroupRoutes from './src/routers/GroupRoutes.js'
import MLRoutes from './src/routers/MLRoutes.js' 
import axios from "axios";
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
app.use("/grp" , GroupRoutes);
app.use('/Ai' , MLRoutes)
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

    if (!APP_CERTIFICATE) {
      return res.status(500).json({ 
        success: false,
        error: "Agora App Certificate not configured",
        message: "Please add AGORA_APP_CERTIFICATE to your environment variables."
      });
    }

    const expirationTimeInSeconds = 3600;
    const currentTimestamp = Math.floor(Date.now() / 1000);
    const privilegeExpiredTs = currentTimestamp + expirationTimeInSeconds;

    const userId = uid ? parseInt(uid) : 0;

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

// Create HTTP server
const server = http.createServer(app);

// Create socket server
const io = new Server(server, {
  cors: {
    origin: "*",
  },
});

let onlineUsers = {};
let userGroups = {}; // Track which groups users are in

global.io = io;
global.onlineUsers = onlineUsers;
global.userGroups = userGroups;

io.on("connection", (socket) => {
  console.log("🟢 User Connected:", socket.id);

  // ----------------- JOIN USER -----------------
  socket.on("join", (userId) => {
    onlineUsers[userId] = socket.id;
    console.log("👤 User Joined:", userId, "Socket:", socket.id);
  });

  // ----------------- JOIN GROUP -----------------
  socket.on("joinGroup", ({ userId, groupId }) => {
    if (!userGroups[groupId]) {
      userGroups[groupId] = new Set();
    }
    userGroups[groupId].add(userId);
    
    socket.join(groupId); // Join socket room for this group
    console.log(`👥 User ${userId} joined group ${groupId}`);
  });

  // ----------------- LEAVE GROUP -----------------
  socket.on("leaveGroup", ({ userId, groupId }) => {
    if (userGroups[groupId]) {
      userGroups[groupId].delete(userId);
      if (userGroups[groupId].size === 0) {
        delete userGroups[groupId];
      }
    }
    
    socket.leave(groupId); // Leave socket room
    console.log(`👋 User ${userId} left group ${groupId}`);
  });

  // ----------------- SEND GROUP MESSAGE -----------------
  socket.on("sendGroupMessage", (messageData) => {
    const { groupId, senderId, text, messageType, replyTo } = messageData;
    
    console.log(`📨 Group message from ${senderId} to group ${groupId}: ${text}`);
    
    // Broadcast to all users in the group
    io.to(groupId).emit("newGroupMessage", {
      _id: Date.now().toString(), // Temporary ID until saved to DB
      groupId,
      sender: {
        _id: senderId,
        username: "Loading...", // Will be populated from DB
        profilePic: ""
      },
      text,
      messageType: messageType || "text",
      replyTo: replyTo || null,
      createdAt: new Date().toISOString(),
      isTemporary: true // Flag to identify unsaved messages
    });
  });

  // ----------------- TYPING INDICATOR -----------------
  socket.on("groupTypingStart", ({ groupId, userId }) => {
    socket.to(groupId).emit("userTypingInGroup", { 
      groupId, 
      userId,
      isTyping: true 
    });
  });

  socket.on("groupTypingStop", ({ groupId, userId }) => {
    socket.to(groupId).emit("userTypingInGroup", { 
      groupId, 
      userId,
      isTyping: false 
    });
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

  // ----------------- GROUP CALL SIGNALING -----------------
  socket.on("startGroupCall", ({ groupId, channelName, callType, fromUserId }) => {
    console.log(`📞 Group call initiated in ${groupId}, channel: ${channelName}, type: ${callType}`);
    
    // Notify all group members
    socket.to(groupId).emit("incomingGroupCall", {
      groupId,
      channelName,
      callType,
      fromUserId
    });
  });

  // ----------------- DISCONNECT -----------------
  socket.on("disconnect", () => {
    console.log("🔴 User Disconnected:", socket.id);
    
    // Remove user from online users
    for (let userId in onlineUsers) {
      if (onlineUsers[userId] === socket.id) {
        delete onlineUsers[userId];
        
        // Remove user from all groups
        for (let groupId in userGroups) {
          userGroups[groupId].delete(userId);
          if (userGroups[groupId].size === 0) {
            delete userGroups[groupId];
          }
        }
        break;
      }
    }
  });
});
// Helper function to emit group messages (can be used in your routes)
export const emitGroupMessage = (messageData) => {
  const { groupId, sender, text, messageType, replyTo } = messageData;
  
  io.to(groupId).emit("newGroupMessage", {
    ...messageData,
    isTemporary: false // This message is from DB
  });
  
  console.log(`📢 Emitted group message to ${groupId} from ${sender._id}`);
};
const keepFastAPIAlive = () => {
  const FASTAPI_URL = 'https://roast-ai-lyg2.onrender.com';
  
  const pingFastAPI = async () => {
    try {
      console.log(`[${new Date().toLocaleTimeString()}] 🔄 Pinging FastAPI...`);
      await axios.get(`${FASTAPI_URL}`, { timeout: 10000 });
      console.log(`[${new Date().toLocaleTimeString()}] ✅ FastAPI is alive`);
    } catch (error) {
      console.log(`[${new Date().toLocaleTimeString()}] ❌ FastAPI ping failed`);
    }
  };
  
  setInterval(pingFastAPI, 2 * 60 * 1000); // Every 10 minutes
  setTimeout(pingFastAPI, 5000); // Initial ping
  
  console.log('🔄 FastAPI keep-alive service started');
};

// Start keep-alive
keepFastAPIAlive();



connectDB()
  .then(() => {
    server.listen(port, "0.0.0.0", () => {
      console.log(`🚀 Server + Socket running at ${port}`);
    });
  })
  .catch((error) => {
    console.error("❌ DB Connection error:", error);
  });