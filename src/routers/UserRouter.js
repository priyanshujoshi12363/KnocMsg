import { Router } from "express";
import { Isactive, Login, Logout, Register } from "../controllers/UserController.js";


const router = Router()

router.post('/register' , Register)
router.post('/login' , Login)
router.post('/logout' , Logout)
router.post('/isactive' , Isactive)

export default router;