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

// ============== PERPLEXITY API FUNCTION ==============
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
          content: `Tu duniya ka sabse bada roast master hai. HINGLISH mein bol. DOST ko roast kar raha hai. Rules:
          
          FORMAT: Har roast 1-2 lines. Har roast ends with EMOJI.
          LANGUAGE: Hinglish + Creative gaaliyan (bhosdike, chutiye, gandu - but funny)
          STYLE: Short, punchy, savage, funny
          TOPICS: Face features, style, personality, life, career
          
          PERFECT EXAMPLES (COPY THIS STYLE):
          "Bhosdike itni badi aankhein hai par teri aukaat nahi dikhti! Chutiya hai kya? 🦯"
          "Naak itni choti hai ki teri personality se bhi choti hai! Laude ka size! 💨"
          "Kya be, teri crush ne reject kar diya? Gand fat gayi? 🥶"
          "Tu aisa lagta hai jaise nature ka failed experiment! Abortion se bach gaya! 👽"
          "Aise face ke saath toh birth certificate cancel karna chahiye! DNA test karwa! 📜"
          "Round face = teri life ka round of failures! Hat-trick of Ls! 🎩"
          "🎯 FINAL: Tere face se better toh roadside ka kutte ka expression hai! Bhau bhau! 🌐"
          
          Give EXACTLY 7 ROASTS in EXACTLY above format. NO EXPLANATIONS. NO ESSAYS.`
        },
        {
          role: 'user',
          content: `Bhosdike mere dost ki photo hai. Iski gaand maar de!
          
          Photo URL: ${imageUrl}
          
          Photo dekh aur 7 SAVAGE ROASTS de:
          1. Eyes/face feature roast
          2. Nose/smile roast  
          3. Hair/style roast
          4. Expression roast
          5. Background roast
          6. Overall vibe roast
          7. Ultimate savage roast
          
          Har roast MAX 2 lines. Har roast ends with EMOJI. PURE HINGLISH.`
        }
      ],
      max_tokens: 1000,
      temperature: 0.95,
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
    const roasts = parseRoasts(roastText);
    
    return {
      roasts: roasts,
      message: "Aye haye! Perplexity ne teri le li! 🔥",
      raw_response: response.data
    };
  }
  
  throw new Error("Perplexity ne kuch nahi bola!");
};

// ============== BACKUP API FUNCTION ==============
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
const parseRoasts = (text) => {
  const lines = text.split('\n').map(line => line.trim()).filter(line => line.length > 0);
  const roasts = [];
  
  for (let line of lines) {
    // Remove numbering and quotes
    let cleanLine = line
      .replace(/^\d+[\.\)\-\:]\s*/, '')
      .replace(/^[\"\'\-•*]\s*/, '')
      .replace(/^Roast\s*\d*\s*:\s*/i, '')
      .trim();
    
    // Skip if it's instructions or too long/short
    if (cleanLine.length < 10 || cleanLine.length > 150) continue;
    
    // Skip if it contains instruction words
    const instructionWords = ['example', 'format', 'rules', 'give', 'photo url', 'model', 'temperature'];
    if (instructionWords.some(word => cleanLine.toLowerCase().includes(word))) continue;
    
    // Add emoji if missing
    if (!hasEmoji(cleanLine)) {
      cleanLine = addRandomEmoji(cleanLine);
    }
    
    // Add Hinglish starter if missing
    if (!hasHinglishStarter(cleanLine)) {
      cleanLine = addHinglishStarter(cleanLine);
    }
    
    roasts.push(cleanLine);
    
    if (roasts.length >= 7) break;
  }
  
  // Fill remaining with savage roasts
  while (roasts.length < 7) {
    roasts.push(getRandomSavageRoast());
  }
  
  return roasts.slice(0, 7);
};

// ============== MISSING FUNCTIONS ==============
const hasEmoji = (text) => {
  // Simple emoji detection
  const emojiRanges = [
    /\p{Emoji}/u, // Modern emoji detection
    /[\u{1F600}-\u{1F64F}]/u, // Emoticons
    /[\u{1F300}-\u{1F5FF}]/u, // Misc symbols
    /[\u{1F680}-\u{1F6FF}]/u, // Transport
    /[\u{2600}-\u{26FF}]/u,   // Misc symbols
    /[\u{2700}-\u{27BF}]/u,   // Dingbats
  ];
  
  return emojiRanges.some(regex => regex.test(text));
};

const addRandomEmoji = (text) => {
  const emojis = ['🦯', '💨', '🥶', '👽', '📜', '🎩', '🌐', '😭', '😂', '🤣', '💀', '🔥', '🎯', '📸', '🤢', '🔮', '😨', '💇‍♂️', '🚫', '🍔', '📶', '⏳', '👁️‍🗨️', '🎭', '🖼️', '😴', '⚠️', '🤖', '👎', '🤡', '💩', '👻', '☠️', '🤮', '🥴', '😵', '💫', '🖕', '😈'];
  return text + ' ' + emojis[Math.floor(Math.random() * emojis.length)];
};

const hasHinglishStarter = (text) => {
  const starters = ['bhosdike', 'chutiye', 'gandu', 'laude', 'madarchod', 'behenchod', 'bhai', 'yaar', 'arey', 'oye', 'kya be', 'abe'];
  return starters.some(starter => text.toLowerCase().startsWith(starter));
};

const addHinglishStarter = (text) => {
  const starters = ['Bhosdike ', 'Chutiye ', 'Gandu ', 'Laude ', 'Bhai ', 'Yaar ', 'Arey ', 'Oye ', 'Kya be '];
  // 70% chance to add starter
  if (Math.random() > 0.3) {
    return starters[Math.floor(Math.random() * starters.length)] + text.toLowerCase();
  }
  return text;
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
    "picture": "picture"
  };
  
  return englishRoasts.map(roast => {
    let hinglish = roast;
    Object.keys(translationMap).forEach(eng => {
      const regex = new RegExp(`\\b${eng}\\b`, 'gi');
      hinglish = hinglish.replace(regex, translationMap[eng]);
    });
    
    // Add bhai if missing
    if (!hinglish.includes('bhai') && !hinglish.includes('yaar')) {
      hinglish = "Bhai " + hinglish.charAt(0).toLowerCase() + hinglish.slice(1);
    }
    
    // Add emoji if missing
    if (!hasEmoji(hinglish)) {
      hinglish = addRandomEmoji(hinglish);
    }
    
    return hinglish;
  });
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

const getRandomSavageRoast = () => {
  const roasts = [
    "Bhosdike tere baal dekh ke lagta hai tu barber se zyada barber se darta hai! 😂",
    "Chutiye teri smile fake hai jaise tere career ke promises! 🤥",
    "Gandu tu aisa lagta hai jaise life ka loading screen! ⏳",
    "Laude tere future planning dekh ke lagta hai lottery tickets collect karta hai! 🎫",
    "Madarchod teri personality itni boring hai ki suicide hota hai! ☠️",
    "Behenchod background dekh ke lagta hai office ke bathroom mein photo liya hai! 🚽",
    "Bhai tu aisa lagta hai jaise human version of '404 Error'! ⚠️"
  ];
  return roasts[Math.floor(Math.random() * roasts.length)];
};