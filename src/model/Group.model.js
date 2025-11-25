import mongoose from "mongoose";


const GroupSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    admin: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
    },
    members: [
        {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            default: [] 
        }
    ]


}, { timestamps: true })

export const Group = mongoose.model("Group", GroupSchema)