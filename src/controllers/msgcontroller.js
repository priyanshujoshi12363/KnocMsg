import MessageModel from "../model/Message.model.js";
import { User } from "../model/User.model";
export const sendMessage = async (req, res) => {
  try {
    const { sender, receiver, text, messageType, fileUrl, fileSize, thumbnailUrl, duration, replyTo } = req.body;

    if (!sender || !receiver) {
      return res.status(400).json({
        success: false,
        message: "Sender and Receiver required",
      });
    }

    // 1️⃣ Save message to DB
    const newMessage = await MessageModel.create({
      sender,
      receiver,
      text,
      messageType,
      fileUrl,
      fileSize,
      thumbnailUrl,
      duration,
      replyTo,
      deliveredAt: new Date(),
    });

    // 2️⃣ Populate sender details
    const populatedMessage = await MessageModel.findById(newMessage._id)
      .populate("sender", "username profilePic")
      .populate("receiver", "username profilePic")
      .populate("replyTo");

    // 3️⃣ Get receiver socket id
    const receiverSocketId = global.onlineUsers[receiver];

    // 4️⃣ Send realtime message
    if (receiverSocketId) {
      global.io.to(receiverSocketId).emit("messageReceived", populatedMessage);
    }

    return res.status(200).json({
      success: true,
      message: populatedMessage,
    });

  } catch (error) {
    console.error("Send Message Error:", error);
    return res.status(500).json({
      success: false,
      message: "Server Error",
    });
  }
};
