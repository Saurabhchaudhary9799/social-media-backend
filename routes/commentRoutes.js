import express from "express"

import { protect } from "../controllers/authController.js"
import { createComment, deleteComment, getAllComments } from "../controllers/commentController.js"


const router = express.Router({ mergeParams: true })


router.use(protect)
router.route("/").post(createComment).get(getAllComments)

router.route("/:commentId").delete(deleteComment)

export default router