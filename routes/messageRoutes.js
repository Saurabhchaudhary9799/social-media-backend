import express from "express"

import { protect } from "../controllers/authController.js"
import { allMessage, getUserConversations, sendMessage } from "../controllers/messageController.js"



const router = express.Router({ mergeParams: true })


router.use(protect)
router.route("/:userId/conversations").get(getUserConversations);
router.route("/:receiverId/message").post(sendMessage).get(allMessage)



export default router