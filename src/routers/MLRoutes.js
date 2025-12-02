import { Router } from "express";
import { roastFace } from "../controllers/AiController.js";
import multer from "multer";

const router = Router();
const upload = multer({ storage: multer.memoryStorage() });


router.post("/roast", upload.single("image"), roastFace);

export default router;