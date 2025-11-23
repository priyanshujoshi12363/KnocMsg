import mongoose from "mongoose";

const ConversationSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: ["private", "group"],
      required: true,
    },

    // For private chat
    members: [
      { type: mongoose.Schema.Types.ObjectId, ref: "User" }
    ],

    // For groups
    name: String,
    groupAvatar: String,
    admin: { type: mongoose.Schema.Types.ObjectId, ref: "User" },

    lastMessage: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Message",
    },
  },
  { timestamps: true }
);

export const Conversation =  mongoose.model("Conversation", ConversationSchema);
