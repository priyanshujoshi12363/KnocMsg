import { Router } from "express";
import { sendMessage } from "../controllers/msgcontroller.js";

const router = Router()

router.post('/send' , sendMessage)

export default router