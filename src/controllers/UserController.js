import { User } from "../model/User.model.js";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import { uploadOnCloudinary } from "../utils/cloudinary.js";

export const Register = async (req, res) => {
  try {
    const { username, email, password } = req.body;

    if (!username || !email || !password) {
      return res.status(400).json({
        success: false,
        message: "Username, email and password are required",
      });
    }

    // username exists?
    const existingUser = await User.findOne({ username });
    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: "Username already exists",
      });
    }

    // email exists?
    const existingEmail = await User.findOne({ email });
    if (existingEmail) {
      return res.status(409).json({
        success: false,
        message: "Email already exists",
      });
    }

    // Upload avatar if file exists
    let avatarUrl = null;
    if (req.file) {
      const cloudinaryResult = await uploadOnCloudinary(req.file.buffer, {
        folder: "chatapp/avatars",
      });
      avatarUrl = cloudinaryResult.secure_url;
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const sessionId = crypto.randomBytes(16).toString("hex");

    const newUser = await User.create({
      username,
      email,
      password: hashedPassword,
      profilePic: avatarUrl, 
      sessionId,
    });

    const token = jwt.sign(
      { userId: newUser._id, sessionId },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    return res.status(201).json({
      success: true,
      message: "User registered successfully",
      user: {
        _id: newUser._id,
        username,
        email,
        avatar: avatarUrl,
        sessionId,
      },
      token,
    });

  } catch (error) {
    console.error(error);
    return res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};


export const Login = async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({
        success: false,
        message: "Username and password required",
      });
    }

    const user = await User.findOne({ username });
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    if (user.sessionId) {
      return res.status(409).json({
        success: false,
        message: "User already logged in from another device",
        sessionId: user.sessionId
      });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: "Invalid password",
      });
    }

    const sessionId = crypto.randomBytes(16).toString("hex");
    user.sessionId = sessionId;
    await user.save();

    const token = jwt.sign(
      { userId: user._id, sessionId: sessionId },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    return res.status(200).json({
      success: true,
      message: "Login successful",
      user: {
        _id: user._id,
        username: user.username,
        sessionId: user.sessionId,
        token: token,
      },
    });

  } catch (error) {
    console.log(error);
    return res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};


export const Logout = async (req, res) => {
  try {
    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: "userId is required",
      });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found or already logged out",
      });
    }

    user.sessionId = null;
    await user.save();

    return res.status(200).json({
      success: true,
      message: "Logout successful",
    });

  } catch (error) {
    console.error(error);
    return res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};


export const Isactive = async (req, res) => {
  try {
    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: "userId is required",
      });
    }

    const user = await User.findByIdAndUpdate(
      userId,
      { isOnline: true },
      { new: true } 
    );

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    setTimeout(async () => {
      try {
        await User.findByIdAndUpdate(userId, { isOnline: false });
        console.log(`User ${user.username} is now offline`);
      } catch (err) {
        console.error("Failed to set user offline:", err);
      }
    }, 30000); 

    return res.status(200).json({
      success: true,
      message: "User is now active",
      user: {
        _id: user._id,
        username: user.username,
        isOnline: user.isOnline,
        sessionId: user.sessionId,
      },
    });

  } catch (error) {
    console.error(error);
    return res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};
