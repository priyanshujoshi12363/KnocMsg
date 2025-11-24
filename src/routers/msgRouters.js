import { Router } from "express";
import { getChatHistory, sendMessage } from "../controllers/msgcontroller.js";

const router = Router()

router.post('/send' , sendMessage)
router.post('/get/:otherUserId' , getChatHistory)

export default router