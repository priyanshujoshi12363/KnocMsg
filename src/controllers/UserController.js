import { User } from "../model/User.model.js";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import { uploadOnCloudinary } from "../utils/cloudinary.js";


export const Register = async (req, res) => {
  try {
    const { username, email, password } = req.body;

    // Validation
    if (!username || !email || !password) {
      return res.status(400).json({
        success: false,
        message: "Username, email and password are required",
      });
    }

    // Username exists?
    if (await User.findOne({ username })) {
      return res.status(409).json({
        success: false,
        message: "Username already exists",
      });
    }

    // Email exists?
    if (await User.findOne({ email })) {
      return res.status(409).json({
        success: false,
        message: "Email already exists",
      });
    }

    // Upload avatar if provided
    let avatarUrl = null;
    if (req.file) {
      try {
        const uploaded = await uploadOnCloudinary(req.file.buffer, {
          folder: "chatapp/avatars",
        });
        avatarUrl = uploaded.secure_url;
      } catch (err) {
        console.log("Cloudinary Upload Error:", err);
        return res.status(500).json({
          success: false,
          message: "Avatar upload failed",
        });
      }
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = await User.create({
      username,
      email,
      password: hashedPassword,
      profilePic: avatarUrl,
      isActive: false,
    });

    return res.status(201).json({
      success: true,
      message: "User registered successfully",
      user: {
        _id: newUser._id,
        username,
        email,
        avatar: avatarUrl,
      },
    });

  } catch (error) {
    console.error("Register Error:", error);
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

export const getuserdata = async (req, res) => {
  try {
    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: "userId is required",
      });
    }

    // Find user
    const user = await User.findById(userId).select("-password"); 
    // (remove password from response for safety)

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "User data fetched",
      user,
    });

  } catch (error) {
    console.error("getuserdata error:", error);
    return res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};


export const editData = async (req, res) => {
  try {
    const { userId, username, email, status } = req.body;

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: "userId is required",
      });
    }

    const updateData = {};

    // Add text fields only if provided
    if (username) updateData.username = username;
    if (email) updateData.email = email;
    if (status) updateData.status = status;

    // If image is provided
    if (req.file) {
      const uploadRes = await uploadOnCloudinary(req.file.buffer, {
        folder: "chatapp/profilePics",
      });

      updateData.profilePic = uploadRes.secure_url;
    }

    // If no fields provided
    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({
        success: false,
        message: "No fields provided to update",
      });
    }

    const updatedUser = await User.findByIdAndUpdate(userId, updateData, {
      new: true,
    });

    if (!updatedUser) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "User updated successfully",
      user: updatedUser,
    });

  } catch (error) {
    console.error("editData Error:", error);
    return res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};
export const search = async (req, res) => {
  try {
    const { username, page = 1, limit = 20 } = req.body;

    console.log("Search request received:", { username, page, limit });

    if (!username || username.length < 2) {
      return res.status(400).json({
        success: false,
        message: "Username must be at least 2 characters long"
      });
    }
    const testUser = await User.findOne({});
    console.log("Test user found:", testUser ? "Yes" : "No");

    const exactUsers = await User.find({
      username: username
    })
    .select('_id username profilePic status isOnline')
    .limit(5)
    .lean();

    // Option 2: Case insensitive search
    const caseInsensitiveUsers = await User.find({
      username: { $regex: username, $options: 'i' }
    })
    .select('_id username profilePic status')
    .limit(5)
    .lean();


    // Option 3: Prefix search (what we actually want)
    const prefixUsers = await User.find({
      username: { $regex: `^${username}`, $options: 'i' }
    })
    .select('_id username profilePic status ')
    .limit(limit)
    .lean();

    return res.status(200).json({
      success: true,
      message: "Search completed successfully",
      users: prefixUsers,
      debug: {
        exactMatches: exactUsers.length,
        caseInsensitive: caseInsensitiveUsers.length,
        prefixMatches: prefixUsers.length,
        searchTerm: username
      },
      pagination: {
        currentPage: page,
        hasNext: prefixUsers.length === limit
      }
    });

  } catch (error) {
    console.error("Search error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error during search",
      error: error.message
    });
  }
};
export const addFollower = async (req, res) => {
  try {
    // Get both user IDs from request body
    const { userId1, userId2 } = req.body;

    // Validate input
    if (!userId1 || !userId2) {
      return res.status(400).json({
        success: false,
        message: "Both userId1 and userId2 are required"
      });
    }

    if (userId1 === userId2) {
      return res.status(400).json({
        success: false,
        message: "Users cannot follow themselves"
      });
    }

    // Find both users
    const [user1, user2] = await Promise.all([
      User.findById(userId1),
      User.findById(userId2)
    ]);

    if (!user1 || !user2) {
      return res.status(404).json({
        success: false,
        message: "One or both users not found"
      });
    }

    // Check if already following each other
    const user1FollowingUser2 = user1.totalFollowers.includes(userId2);
    const user2FollowingUser1 = user2.totalFollowers.includes(userId1);

    if (user1FollowingUser2 && user2FollowingUser1) {
      return res.status(400).json({
        success: false,
        message: "Users are already following each other"
      });
    }

    // Push each other's IDs into totalFollowers arrays
    if (!user1FollowingUser2) {
      user1.totalFollowers.push(userId2);
    }

    if (!user2FollowingUser1) {
      user2.totalFollowers.push(userId1);
    }

    // Save both users
    await Promise.all([
      user1.save(),
      user2.save()
    ]);

    return res.status(200).json({
      success: true,
      message: "Users are now following each other",
      data: {
        user1: {
          id: user1._id,
          username: user1.username,
          totalFollowers: user1.totalFollowers.length
        },
        user2: {
          id: user2._id,
          username: user2.username,
          totalFollowers: user2.totalFollowers.length
        }
      }
    });

  } catch (error) {
    console.error("Error in addFollower:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message
    });
  }
};

export const getFollowers = async (req, res) => {
  try {
    const { userId } = req.params;

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: "User ID is required"
      });
    }

    // Find the user first
    const user = await User.findById(userId).select('totalFollowers');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found"
      });
    }

    // Get all follower details manually
    const followers = await User.find(
      { _id: { $in: user.totalFollowers } },
      'username profilePic status createdAt updatedAt'
    );

    // Format response to match your database structure
    const formattedFollowers = followers.map(follower => ({
      _id: follower._id,
      username: follower.username,
      profilePic: follower.profilePic,
      email: follower.email,
      status: follower.status,
      isOnline: follower.isOnline,
      createdAt: follower.createdAt,
      updatedAt: follower.updatedAt
    }));

    return res.status(200).json({
      success: true,
      message: "Followers fetched successfully",
      data: formattedFollowers
    });

  } catch (error) {
    console.error("Error in getFollowers:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message
    });
  }
};