import { Router } from "express";
import multer from "multer";
import { createGrp, getGroupsByUserId , sendGrpmsg  , getGroupMessages} from "../controllers/GroupController.js";


const storage = multer.memoryStorage();
const upload = multer({ storage });

const router = Router()

router.post("/create", upload.single("groupImg"), createGrp );
router.get('/:userId' , getGroupsByUserId)
router.post("/message", upload.single("file"), sendGrpmsg);
router.get("/:groupId" , getGroupMessages)

export default router