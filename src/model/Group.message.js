import mongoose from "mongoose";

const GroupMessageSchema = new mongoose.Schema(
  {

    groupId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Group",
      required: true,
      index: true
    },
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true
    },
    text: {
      type: String,
      trim: true,
      maxlength: 5000
    },
    messageType: {
      type: String,
      enum: ["text", "image", "video", "audio", "file"],
      default: "text"
    },
    fileUrl: String,
    fileSize: Number,
    thumbnailUrl: String,
    duration: Number,
    readBy: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User"
      }
    ],
    replyTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "GroupMsg"
    }
  },
  { timestamps: true }
);

// Auto-delete messages after 1 day (86400 seconds)
GroupMessageSchema.index({ createdAt: 1 }, { expireAfterSeconds: 86400 });

// Index for fast fetching recent messages
GroupMessageSchema.index({ groupId: 1, createdAt: -1 });

export const GroupMessage = mongoose.model("GroupMsg", GroupMessageSchema);
