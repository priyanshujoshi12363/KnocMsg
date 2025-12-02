import { uploadOnCloudinary } from "../utils/cloudinary.js";
import axios from "axios";

export const roastFace = async (req, res) => {
  try {
    // Check if file exists
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "Please upload an image file",
      });
    }

    console.log("📸 Processing face roast request...");

    // 1. Upload image to Cloudinary
    let cloudinaryResult;
    try {
      cloudinaryResult = await uploadOnCloudinary(req.file.buffer, {
        folder: "face-roast",
        transformation: [
          { width: 800, height: 800, crop: "limit" },
          { quality: "auto" },
        ],
      });
      console.log(`✅ Uploaded to Cloudinary: ${cloudinaryResult.secure_url}`);
    } catch (cloudinaryError) {
      console.error("❌ Cloudinary error:", cloudinaryError);
      return res.status(500).json({
        success: false,
        message: "Failed to upload image",
        error: cloudinaryError.message,
      });
    }

    // 2. Send to FastAPI for face roasting
    let fastApiResponse;
    try {
      // Use environment variable or default to localhost
      const fastApiUrl = process.env.FASTAPI_URL || "http://localhost:8000/api/v1/roast";
      
      fastApiResponse = await axios.post(
        fastApiUrl,
        {
          url: cloudinaryResult.secure_url,
        },
        {
          headers: {
            "Content-Type": "application/json",
          },
          timeout: 30000, // 30 seconds timeout
        }
      );
      
      console.log(`✅ Received ${fastApiResponse.data.count || 0} roasts`);
    } catch (fastApiError) {
      console.error("❌ FastAPI error:", fastApiError.message);
      
      // If FastAPI is down, return some default roasts
      return res.status(200).json({
        success: true,
        roasts: [
          "🔥 Your face is so hot, it could melt steel!",
          "👀 Your eyes sparkle like diamonds!",
          "😄 That smile could light up a room!",
          "🎭 Actually, the roast server is taking a break!",
          "🤖 Beep boop! Face detected but roast engine sleeping!"
        ],
        count: 5,
        message: "Face detected! (Roast server offline, using default roasts)",
        image_url: cloudinaryResult.secure_url,
      });
    }

    // 3. Return the roasts
    return res.status(200).json({
      success: true,
      roasts: fastApiResponse.data.roasts || [],
      count: fastApiResponse.data.count || 0,
      message: fastApiResponse.data.message || "Face analysis complete!",
      image_url: cloudinaryResult.secure_url,
      cloudinary_public_id: cloudinaryResult.public_id,
    });

  } catch (error) {
    console.error("❌ Unexpected error in roastFace:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};

/**
 * Simple test endpoint
 */
export const testRoast = (req, res) => {
  return res.status(200).json({
    success: true,
    message: "Roast API is working!",
    endpoint: "POST /roast with image file",
    example_response: {
      success: true,
      roasts: ["Your eyes are amazing!", "Great smile!"],
      count: 2,
      message: "Face analysis complete!",
    },
  });
};