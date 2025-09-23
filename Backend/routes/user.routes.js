import express from "express"
import { askToAssistant, getCurrentUsers, updateAssistant } from "../controllers/user.controllers.js";
import { isAuth } from './../middlewares/isAuth.js';
import upload from './../middlewares/multer.js';

const userRouter = express.Router()

userRouter.get("/current",isAuth, getCurrentUsers)
userRouter.post("/update",isAuth, upload.single("assistantImage"), updateAssistant)
userRouter.post("/asktoassistant",isAuth, askToAssistant)


export default userRouter;