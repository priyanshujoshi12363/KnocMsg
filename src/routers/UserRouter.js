import { Router } from "express";
import { Isactive, Login, Logout, Register } from "../controllers/UserController.js";
import multer from "multer";

const storage = multer.memoryStorage(); // store file in buffer
const upload = multer({ storage });
const router = Router()

router.post("/register", upload.single("avatar"), Register);
router.post('/login' , Login)
router.post('/logout' , Logout)
router.post('/isactive' , Isactive)

export default router;