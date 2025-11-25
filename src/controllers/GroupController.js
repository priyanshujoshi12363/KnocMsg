import { Group } from "../model/Group.model.js";
import { User } from "../model/User.model.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { GroupMessage } from "../model/Group.message.js";

export const createGrp = async (req, res) => {
  try {
    let { name, adminId, memberIds } = req.body;

    // Parse memberIds if sent as JSON string
    if (typeof memberIds === "string") {
      memberIds = JSON.parse(memberIds);
    }

    // Basic validation
    if (!name || !adminId) {
      return res.status(400).json({ success: false, message: "Group name and admin are required." });
    }

    // Check if admin exists
    const admin = await User.findById(adminId);
    if (!admin) {
      return res.status(400).json({ success: false, message: "Admin does not exist." });
    }

    // Validate members exist
    let validMembers = [];
    if (memberIds && memberIds.length > 0) {
      const membersExist = await User.find({ _id: { $in: memberIds } });
      validMembers = membersExist.map(user => user._id);

      if (validMembers.length !== memberIds.length) {
        return res.status(400).json({ success: false, message: "Some members do not exist." });
      }
    }

    // Ensure admin is included
    const members = Array.from(new Set([...validMembers, adminId]));

    // Handle image upload
    let groupImgUrl = "";
    if (req.file && req.file.buffer) {
      const result = await uploadOnCloudinary(req.file.buffer, { folder: "group_images" });
      groupImgUrl = result.secure_url;
    }

    // Create group
    const newGroup = new Group({
      name,
      admin: adminId,
      members,
      groupImg: groupImgUrl
    });

    await newGroup.save();

    return res.status(201).json({ success: true, message: "Group created successfully", group: newGroup });
  } catch (error) {
    console.error("Create group error:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

export const getGroupsByUserId = async (req, res) => {
  try {
    const { userId } = req.params;

    if (!userId) {
      return res.status(400).json({ success: false, message: "User ID is required." });
    }

    // Find groups where this user is in the members array
    const groups = await Group.find({ members: userId }).select("name groupImg");

    return res.status(200).json({ success: true, groups });
  } catch (error) {
    console.error("Get groups error:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};


export const sendGrpmsg = async (req, res) => {
  try {
    const { groupId, senderId, text, messageType, replyTo } = req.body;

    if (!groupId || !senderId) {
      return res.status(400).json({ success: false, message: "GroupId and senderId are required" });
    }

    // 1️⃣ Validate group exists
    const group = await Group.findById(groupId);
    if (!group) return res.status(404).json({ success: false, message: "Group not found" });

    // 2️⃣ Validate sender exists
    const sender = await User.findById(senderId);
    if (!sender) return res.status(404).json({ success: false, message: "Sender not found" });

    // 3️⃣ Handle file upload (if messageType is media)
    let fileUrl = "", thumbnailUrl = "", duration = null, fileSize = null;
    if (req.file && req.file.buffer) {
      const result = await uploadOnCloudinary(req.file.buffer, { folder: "group_messages" });
      fileUrl = result.secure_url;
      fileSize = result.bytes;
      // optional: thumbnailUrl or duration if needed
    }

    // 4️⃣ Save group message in DB
    const newMessage = await GroupMessage.create({
      groupId,
      sender: senderId,
      text,
      messageType: messageType || "text",
      fileUrl,
      fileSize,
      thumbnailUrl,
      duration,
      replyTo: replyTo || null,
    });

    // 5️⃣ Populate sender info for frontend
    const populatedMessage = await GroupMessage.findById(newMessage._id)
      .populate("sender", "username ")
      .populate("replyTo");

    // 6️⃣ Emit to all online group members
    group.members.forEach(memberId => {
      const socketId = global.onlineUsers[memberId.toString()];
      if (socketId && memberId.toString() !== senderId) {
        global.io.to(socketId).emit("groupMessageReceived", populatedMessage);
      }
    });

    return res.status(201).json({ success: true, message: "Message sent", data: populatedMessage });
    
  } catch (error) {
    console.error("Send group message error:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};


export const getGroupMessages = async (req, res) => {
  try {
    const { groupId } = req.params;

    if (!groupId) {
      return res.status(400).json({ success: false, message: "Group ID is required" });
    }

    // Check if group exists
    const group = await Group.findById(groupId);
    if (!group) return res.status(404).json({ success: false, message: "Group not found" });

    // Fetch messages for this group, sorted by createdAt ascending (oldest first)
    const messages = await GroupMessage.find({ groupId })
      .populate("sender", "username ") // populate sender info
      .populate("replyTo") // populate reply message if any
      .sort({ createdAt: 1 }); // oldest to newest

    return res.status(200).json({
      success: true,
      messages,
    });

  } catch (error) {
    console.error("Get group messages error:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};