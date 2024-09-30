import express from "express"

import { protect } from "../controllers/authController.js"
import { handleLikes } from "../controllers/likeController.js"



const router = express.Router({ mergeParams: true })


router.use(protect)
router.route("/").post(handleLikes)

export default router