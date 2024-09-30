import express from "express"

import { protect } from "../controllers/authController.js"
import { handleFollowUnfollow } from "../controllers/followController.js"



const router = express.Router({ mergeParams: true })


router.use(protect)
router.route("/").post(handleFollowUnfollow)

export default router