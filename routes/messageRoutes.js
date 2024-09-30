import express from "express"

import { protect } from "../controllers/authController.js"
import { allMessage, sendMessage } from "../controllers/messageController.js"



const router = express.Router({ mergeParams: true })


router.use(protect)
router.route("/").post(sendMessage).get(allMessage)

export default router