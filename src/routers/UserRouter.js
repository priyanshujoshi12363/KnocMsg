import { Router } from "express";
import { editData, getuserdata,Login, Logout, Register } from "../controllers/UserController.js";
import multer from "multer";

const router = Router();

const storage = multer.memoryStorage();
const upload = multer({ storage });

router.post("/register", upload.single("avatar"), Register);
router.post("/login", Login);
router.post("/logout", Logout);
router.post("/get", getuserdata);
router.post('/edit' , upload.single("profilePic"), editData)
export default router;
