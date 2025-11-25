import mongoose from "mongoose";

const MessageSchema = new mongoose.Schema(
  {
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    receiver: {
      type: mongoose.Schema.Types.ObjectId, 
      ref: 'User',
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
      enum: ['text', 'image', 'video', 'audio', 'file'],
      default: 'text'
    },
    fileUrl: {
      type: String,
      trim: true
    },
    fileSize: Number,
    thumbnailUrl: String,
    duration: Number, 
    readAt: Date,
    deliveredAt: Date,
    replyTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Message'
    },



  }, 
  { 
    timestamps: true
  }
);

MessageSchema.index({ createdAt: 1 }, { expireAfterSeconds: 86400 });

MessageSchema.index({ sender: 1, receiver: 1, createdAt: -1 });
MessageSchema.index({ receiver: 1, isRead: 1 });

MessageSchema.virtual('conversationId').get(function() {
  const participants = [this.sender.toString(), this.receiver.toString()].sort();
  return participants.join('_');
});

export default mongoose.model("Message", MessageSchema);
