import express from "express"
import { getCurrentUsers } from "../controllers/user.controllers.js";
import { isAuth } from './../middlewares/isAuth.js';

const userRouter = express.Router()

userRouter.get("/current",isAuth, getCurrentUsers)

export default userRouter;