import mongoose from "mongoose";


const userSchema = new mongoose.Schema({

    username:{
        type:String,
        required:true
    },
    password:{
        type:String,
        required:true
    },
    profilePic:{
        type:String
    },
    email:{
        type:String,
        required:true
    },
    status: { type: String, default: "Hey! I am using Chat." },

    isOnline: { type: Boolean, default: false },
    lastSeen: { type: Date },

    socketId: { type: String },

    totalFollowers: [
    {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User" 
    },
], 
    sessionId: {
    type: String,
    default:null
}

},{ timestamps: true })

export const User = mongoose.model("User" , userSchema)