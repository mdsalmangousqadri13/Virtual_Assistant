import express from "express"
import { getCurrentUsers, updateAssistant } from "../controllers/user.controllers.js";
import { isAuth } from './../middlewares/isAuth.js';
import upload from './../middlewares/multer.js';

const userRouter = express.Router()

userRouter.get("/current",isAuth, getCurrentUsers)
userRouter.post("/update",isAuth, upload.single("AssistantImage"), updateAssistant)

export default userRouter;