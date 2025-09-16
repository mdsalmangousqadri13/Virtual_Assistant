import express from "express"
import { getCurrentUsers } from "../controllers/user.controllers.js";

const userRouter = express.Router()

userRouter.get("/current", getCurrentUsers)

export default userRouter;