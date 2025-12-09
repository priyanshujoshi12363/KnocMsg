import { uploadOnCloudinary } from "../utils/cloudinary.js";
import axios from "axios";

export const roastFace = async (req, res) => {
  try {
    // Check if file exists
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "Arre bhosdike photo daal pehle! Kya kar raha hai?",
      });
    }

    console.log("🔥 Bhai ka roast shuru...");

    // 1. Upload image to Cloudinary
    let cloudinaryResult;
    try {
      cloudinaryResult = await uploadOnCloudinary(req.file.buffer, {
        folder: "roast-ai",
        transformation: [
          { width: 800, height: 800, crop: "limit" },
          { quality: "auto" },
        ],
      });
      console.log(`✅ Photo upload ho gayi: ${cloudinaryResult.secure_url}`);
    } catch (cloudinaryError) {
      console.error("❌ Cloudinary ne gaand mar di:", cloudinaryError);
      return res.status(500).json({
        success: false,
        message: "Photo upload nahi hua re! Internet check kar!",
        error: cloudinaryError.message,
      });
    }

    // 2. Try Perplexity API FIRST
    let roasts = [];
    let message = "";
    let apiUsed = "";

    try {
      console.log("🤖 Perplexity ko bula raha hoon...");
      const perplexityResponse = await callPerplexitySavageAPI(cloudinaryResult.secure_url);
      
      roasts = perplexityResponse.roasts;
      message = perplexityResponse.message;
      apiUsed = "perplexity";
      
      console.log(`✅ Perplexity ne ${roasts.length} gaaliya di!`);
      
    } catch (perplexityError) {
      console.log("❌ Perplexity so gaya:", perplexityError.message);
      console.log("Backup API try karta hoon...");
      
      // 3. If Perplexity fails, try backup API
      try {
        const backupResponse = await callBackupRoastAPI(cloudinaryResult.secure_url);
        
        roasts = backupResponse.roasts;
        message = backupResponse.message;
        apiUsed = "backup";
        
        console.log(`✅ Backup ne ${roasts.length} roasts diye`);
        
      } catch (backupError) {
        console.log("❌ Sab so gaye... Khud se roast bana raha hoon");
        
        // 4. If ALL fail, use ULTRA SAVAGE default roasts
        roasts = getUltimateSavageRoasts();
        message = "API wale so rahe hain! Ye le meri taraf se gaali!";
        apiUsed = "mera_apna";
      }
    }

    // 5. Return the SAVAGE roasts
    return res.status(200).json({
      success: true,
      roasts: roasts,
      count: roasts.length,
      message: `${message} (${apiUsed} ne bejha hai)`,
      image_url: cloudinaryResult.secure_url,
      cloudinary_public_id: cloudinaryResult.public_id,
      api_used: apiUsed,
      warning: "Bhai mazak hai! Gand mat fula! 😂",
      friendship_test: "Agar baat karna band kar diya toh roast kaam kar gaya! 🤣"
    });

  } catch (error) {
    console.error("❌ Bhai error aa gaya:", error);
    return res.status(500).json({
      success: false,
      message: "Andar kuch toot gaya bhai! Phir try kar!",
      error: error.message,
    });
  }
};

// ============== PERPLEXITY API - ULTRA FREE STYLE ==============
const callPerplexitySavageAPI = async (imageUrl) => {
  const PERPLEXITY_API_KEY = process.env.PERPLEXITY_API_KEY;
  
  if (!PERPLEXITY_API_KEY) {
    throw new Error("Perplexity ka chabi nahi hai bhai!");
  }

  const response = await axios.post(
    'https://api.perplexity.ai/chat/completions',
    {
      model: 'sonar-pro',
      messages: [
        {
          role: 'system',
          content: `Tu duniya ka SABSE SAVAGE roast master hai. HINGLISH mein bol. 
          
          **TU YE KAR:**
          1. PHOTO DEKH - Bas dekh le bhai
          2. JO MANN AAYE ROAST KAR - Full freedom
          3. HAR ROAST 1-2 LINES - Zyada nahi
          4. HAR ROAST END WITH EMOJI - Must
          5. PURE HINGLISH - Gaaliyan free flow
          
          **STYLE:**
          - Dark, savage, abusive but funny
          - No restrictions - roast kya bhi dikhe
          - 1-2 lines maximum
          - Natural flow - jaise dost ko roast karte hai
          
          **EXAMPLES (COPY THIS VIBE):**
          "Bhosdike aise face ke saath toh family functions mein bhi nahi bulate honge! Black sheep! 🐑"
          "Chutiye photo mein bhi depressed lag raha hai? Reality check lena bhool gaya? 🪞"
          "Madarchod tu aisa lag raha hai jaise life ka beta version! Update available nahi hai? 🔄"
          "Gandu itna basic lag raha hai ki tu human version of plain rice hai! No spices! 🍚"
          "Laude teri vibe dekh ke lagta hai tu background character bhi nahi ban sakta! Extras reject! 🎬"
          "Bhenchod photo quality teri life quality se better hai! Irony mar gayi! ⚰️"
          "Abe oye tera expression dekh ke lagta hai bank balance check kiya hoga! Zero! 💸"
          
          Bas photo dekh aur jo bhi aaye roast kar! No format, no rules!`
        },
        {
          role: 'user',
          content: `BHAI YE MERA DOST HAI. PHOTO DEKH AUR JAISE MANN AAYE ROAST KAR.
          
          PHOTO URL: ${imageUrl}
          
          **BAS YE PAKKA RAKH:**
          - Har roast 1-2 lines ONLY
          - Har roast end with EMOJI
          - HINGLISH mein hi bol
          - 7 roasts de
          - No formatting - seedha roasts likh
          
          Tu apna dimaag lagane ki zarurat nahi - jo photo dekh ke first thought aaye, wahi bol!`
        }
      ],
      max_tokens: 800,
      temperature: 0.98, // Maximum creativity
      top_p: 0.9,
      stream: false
    },
    {
      headers: {
        'Authorization': `Bearer ${PERPLEXITY_API_KEY}`,
        'Content-Type': 'application/json',
      },
      timeout: 25000
    }
  );

  if (response.data.choices && response.data.choices[0]) {
    const roastText = response.data.choices[0].message.content;
    const roasts = parseSimpleRoasts(roastText);
    
    return {
      roasts: roasts,
      message: "Perplexity ne apni azaadi se roast kiya! 🗽",
      raw_response: response.data
    };
  }
  
  throw new Error("Perplexity ne kuch nahi bola!");
};

// ============== SIMPLE PARSER ==============
const parseSimpleRoasts = (text) => {
  // Split by any line break
  const lines = text.split(/\n|\. |! |\? /)
    .map(line => line.trim())
    .filter(line => {
      // Simple filtering
      const length = line.length;
      if (length < 15 || length > 120) return false;
      
      // Check if it looks like a roast (not instructions)
      const instructionWords = ['example', 'format', 'rules', 'give', 'photo', 'url', 'model', 'temperature', 'max_tokens', 'system', 'user'];
      const hasInstruction = instructionWords.some(word => line.toLowerCase().includes(word));
      
      return !hasInstruction;
    });

  // Take first 7 valid lines
  let roasts = lines.slice(0, 7);

  // Clean each roast
  roasts = roasts.map(roast => {
    // Remove quotes if any
    roast = roast.replace(/^["']|["']$/g, '');
    
    // Add emoji if missing
    if (!hasEmoji(roast)) {
      roast = addRandomEmoji(roast);
    }
    
    return roast;
  });

  // Fill if less than 7
  while (roasts.length < 7) {
    roasts.push(getRandomFreeRoast());
  }

  return roasts.slice(0, 7);
};

// ============== BACKUP API ==============
const callBackupRoastAPI = async (imageUrl) => {
  const backupUrl = process.env.BACKUP_API_URL || "https://roast-ai-lyg2.onrender.com/api/v1/roast";
  
  const response = await axios.post(
    backupUrl,
    {
      url: imageUrl,
    },
    {
      headers: { "Content-Type": "application/json" },
      timeout: 30000,
    }
  );
  
  // If backup gives English roasts, convert to Hinglish
  let roasts = response.data.roasts || [];
  if (roasts.length > 0 && isEnglish(roasts[0])) {
    roasts = convertToHinglish(roasts);
  }
  
  return {
    roasts: roasts.slice(0, 7),
    message: "Backup API ne bhi thoda roast kar diya!",
    raw_response: response.data
  };
};

// ============== HELPER FUNCTIONS ==============
const hasEmoji = (text) => {
  const emojiRegex = /[\u{1F300}-\u{1F6FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/u;
  return emojiRegex.test(text);
};

const addRandomEmoji = (text) => {
  const emojis = ['🦯', '💨', '🥶', '👽', '📜', '🎩', '🌐', '😭', '😂', '🤣', '💀', '🔥', '🎯', '📸', '🤢', '🔮', '😨', '🚫', '🍔', '📶', '⏳', '🎭', '😴', '⚠️', '🤖', '👎', '🤡', '💩', '👻', '☠️', '🤮', '🥴', '😵', '🖕', '😈', '🐑', '🪞', '🔄', '🍚', '🎬', '⚰️', '💸', '📱', '👻', '📶', '🗺️', '🏃‍♂️'];
  return text + ' ' + emojis[Math.floor(Math.random() * emojis.length)];
};

const hasHinglishStarter = (text) => {
  const starters = ['bhosdike', 'chutiye', 'gandu', 'laude', 'madarchod', 'behenchod', 'bhai', 'yaar', 'arey', 'oye', 'kya be', 'abe', 'sun'];
  return starters.some(starter => text.toLowerCase().startsWith(starter));
};

const isEnglish = (text) => {
  const englishWords = ['your', 'you', 'the', 'and', 'but', 'very', 'really', 'amazing', 'look', 'face'];
  const hinglishWords = ['bhai', 'yaar', 'hai', 'ki', 'ka', 'ke', 'se', 'ne', 'par', 'aur'];
  
  const englishCount = englishWords.filter(word => text.toLowerCase().includes(word)).length;
  const hinglishCount = hinglishWords.filter(word => text.toLowerCase().includes(word)).length;
  
  return englishCount > hinglishCount;
};

const convertToHinglish = (englishRoasts) => {
  const translationMap = {
    "your": "tera",
    "you": "tu",
    "very": "bahot",
    "really": "sach mein",
    "amazing": "zabardast",
    "good": "accha",
    "bad": "bekar",
    "great": "mast",
    "awesome": "kamaal ka",
    "like": "jaise",
    "face": "chehra",
    "smile": "smile",
    "eyes": "aankhein",
    "look": "dikhta",
    "photo": "photo",
    "picture": "picture",
    "hair": "baal",
    "style": "style",
    "background": "peeche"
  };
  
  return englishRoasts.map(roast => {
    let hinglish = roast;
    Object.keys(translationMap).forEach(eng => {
      const regex = new RegExp(`\\b${eng}\\b`, 'gi');
      hinglish = hinglish.replace(regex, translationMap[eng]);
    });
    
    // Add random starter
    const starters = ['Bhosdike ', 'Chutiye ', 'Yaar ', 'Arey '];
    hinglish = starters[Math.floor(Math.random() * starters.length)] + hinglish.toLowerCase();
    
    // Add emoji if missing
    if (!hasEmoji(hinglish)) {
      hinglish = addRandomEmoji(hinglish);
    }
    
    return hinglish;
  });
};

const getRandomFreeRoast = () => {
  const roasts = [
    "Bhosdike photo dekh ke lagta hai tu meme material hai! Viral ho jayega! 📱",
    "Chutiye teri aura dekh ke lagta hai negative vibes free mein deta hai! Exorcist needed! 👻",
    "Madarchod tu aisa lag raha hai jaise WiFi ka password bhool gaya! No connection! 📶",
    "Gandu tera face dekh ke lagta hai life ne tujhe shortcut diya tha par tu lost ho gaya! 🗺️",
    "Laude photo mein bhi tu lag raha hai jaise rent bharna bhool gaya! Landlord chasing! 🏃‍♂️",
    "Bhenchod expression dekh ke lagta hai just got friendzoned! Us bro us! 😭",
    "Abe oye teri vibe dekh ke lagta hai human form of Monday morning! Depression! 😴"
  ];
  return roasts[Math.floor(Math.random() * roasts.length)];
};

const getUltimateSavageRoasts = () => {
  return [
    "Bhosdike itni badi aankhein hai par teri aukaat nahi dikhti! Chutiya hai kya? 🦯",
    "Naak itni choti hai ki teri personality se bhi choti hai! Laude ka size! 💨",
    "Kya be, teri crush ne reject kar diya? Gand fat gayi? 🥶",
    "Tu aisa lagta hai jaise nature ka failed experiment! Abortion se bach gaya! 👽",
    "Aise face ke saath toh birth certificate cancel karna chahiye! DNA test karwa! 📜",
    "Round face = teri life ka round of failures! Hat-trick of Ls! 🎩",
    "🎯 FINAL: Tere face se better toh roadside ka kutte ka expression hai! Bhau bhau! 🌐"
  ];
};