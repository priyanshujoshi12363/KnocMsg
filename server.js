import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import http from "http";
import { Server } from "socket.io";
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
app.use("/msg" , msgRouters)
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

  socket.on("join", (userId) => {
    onlineUsers[userId] = socket.id;
    console.log("User Joined:", userId, "Socket:", socket.id);
  });

  socket.on("disconnect", () => {
    console.log("🔴 User Disconnected:", socket.id);

    for (let id in onlineUsers) {
      if (onlineUsers[id] === socket.id) {
        delete onlineUsers[id];
      }
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
