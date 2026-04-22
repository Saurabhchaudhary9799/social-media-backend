import express from "express";
import {
  createPost,
  deletePost,
  EditPost,
  getAllPosts,
  getHomeFeedPosts,
  getMyPosts,
  getPostDetails,
  savePost,
  unsavePost,
} from "../controllers/postController.js";
import { protect } from "../controllers/authController.js";
import commentRoutes from "./commentRoutes.js";
import likeRoutes from "./likeRoutes.js";

const router = express.Router();

router.use("/:postId/comments", commentRoutes);
router.use("/:postId/like", likeRoutes);

router.use(protect);
router.route("/").post(createPost).get(getAllPosts);
router.route("/home-feed").get(getHomeFeedPosts);
router.route("/user/:userId").get(getMyPosts);

router.route("/:postId").get(getPostDetails).delete(deletePost).patch(EditPost);
router.route("/:postId/save").post(savePost).delete(unsavePost);

export default router;
