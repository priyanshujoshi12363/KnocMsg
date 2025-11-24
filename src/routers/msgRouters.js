import { Router } from "express";
import { sendMessage } from "../controllers/msgcontroller";

const router = Router()

router.post('/send' , sendMessage)

export default router