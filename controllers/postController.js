import cloudinary from "./../utils/CloudinaryConfig.js";
import PostModel from "../models/postModel.js";
import { saveModel } from "../models/followModel.js";
import UserModel from "../models/userModel.js";
import mongoose from "mongoose";

export const createPost = async (req, res) => {
  try {
    const userId = req.user._id;

    // ✅ image must come as URL now
    if (!req.body.image) {
      return res.status(400).json({
        status: "failed",
        message: "Image is required",
      });
    }

    const tagsArray = req.body.tags || [];

    const newPost = await PostModel.create({
      bio: req.body.bio,
      user: userId,
      image: req.body.image, // ✅ already uploaded
      tags: tagsArray,
    });

    return res.status(201).json({
      status: "success",
      post: newPost,
    });
  } catch (error) {
    return res.status(500).json({
      status: "failed",
      message: error.message,
    });
  }
};
export const getAllPosts = async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10; // Default limit is 5
    const skip = parseInt(req.query.skip) || 0;

    const userId = req.user._id;

    const allFollowings = await UserModel.findById({ _id: userId })
      .populate({ path: "followings", select: "_id following -user" })
      .select("followings ");
    // console.log(allFollowings);

    const allPosts = await PostModel.find()
      .populate({
        path: "user",
        select: "-__v ", // Exclude __v from the user
      })
      .populate({
        path: "comments",
        select: "-__v", // Exclude __v from comments
        populate: {
          path: "user",
          select: "id username profile_image", // Include only these fields from the user
        },
      })
      .populate({
        path: "likes",
        select: " user", // Exclude __v from the comments
      })
      .select("-__v")
      .sort({ createdAt: -1 });

    allPosts.forEach((post) => {
      post.comments.sort(
        (a, b) => new Date(b.createdAt) - new Date(a.createdAt),
      );
    });

    const FeedPosts = allPosts.filter((post) => {
      return allFollowings.followings.some(
        (followedUser) => followedUser.following.toString() === post.user?.id,
      );
    });

    // console.log(FeedPosts)
    const posts = FeedPosts.slice(skip, skip + limit);

    res.status(200).json({
      status: "success",
      total: posts.length,
      result: {
        posts: posts,
      },
    });
  } catch (error) {
    res.status(500).json({
      status: "failed",
      message: error.message,
    });
  }
};

export const getHomeFeedPosts = async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10;
    const skip = parseInt(req.query.skip) || 0;

    const posts = await PostModel.find()
      .populate({
        path: "user",
        select: "-__v",
      })
      .populate({
        path: "comments",
        select: "-__v",
        populate: {
          path: "user",
          select: "id username profile_image",
        },
      })
      .populate({
        path: "likes",
        select: "user",
      })
      .select("-__v")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    posts.forEach((post) => {
      post.comments.sort(
        (a, b) => new Date(b.createdAt) - new Date(a.createdAt),
      );
    });

    return res.status(200).json({
      status: "success",
      total: posts.length,
      result: {
        posts,
      },
    });
  } catch (error) {
    return res.status(500).json({
      status: "failed",
      message: error.message,
    });
  }
};

export const getMyPosts = async (req, res) => {
  try {
    const { userId } = req.params;

    const limit = parseInt(req.query.limit) || 10;
    const skip = parseInt(req.query.skip) || 0;

    if (!userId) {
      return res.status(400).json({
        status: "failed",
        message: "UserId is required",
      });
    }

    const posts = await PostModel.find({ user: userId })
      .select("_id bio image createdAt") // ✅ only needed fields
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    res.status(200).json({
      status: "success",
      total: posts.length,
      result: {
        posts,
      },
    });
  } catch (error) {
    res.status(500).json({
      status: "failed",
      message: error.message,
    });
  }
};

export const deletePost = async (req, res) => {
  try {
    const { postId } = req.params;

    // Find the comment by its ID and delete it
    const deletedPost = await PostModel.findByIdAndDelete(postId);

    // If the comment is not found
    if (!deletedPost) {
      return res.status(404).json({
        status: "failed",
        message: "Post not found",
      });
    }

    // Successfully deleted
    res.status(200).json({
      status: "success",
      message: "Post deleted successfully",
    });
  } catch (error) {
    // Error handling
    res.status(400).json({
      status: "failed",
      message: error.message,
    });
  }
};

export const savePost = async (req, res) => {
  try {
    const { postId } = req.params;
    const userId = req.user._id;

    const alreadySaved = await saveModel.findOne({
      user: userId,
      post: postId,
    });

    if (alreadySaved) {
      await saveModel.findByIdAndDelete(alreadySaved._id);

      return res.status(200).json({
        message: "Post unsaved",
        save: {
          user: userId,
        },
      });
    } else {
      let save = await saveModel.create({ user: userId, post: postId });

      // Populate the user and post fields in the response
      //   like = await like.populate('user').populate('post').execPopulate();

      return res.status(200).json({ message: "Post saved", save });
    }
  } catch (error) {
    return res
      .status(500)
      .json({ message: "Internal server error", error: error.message });
  }
};

export const unsavePost = async (req, res) => {
  try {
    const { postId } = req.params;
    const userId = req.user._id;

    // Find and delete the saved post by the userId and postId
    const unSavedPost = await saveModel.findOneAndDelete({
      user: userId,
      post: postId,
    });

    // If the saved post is not found
    if (!unSavedPost) {
      return res.status(404).json({
        status: "failed",
        message: "Post not found or not saved by the user",
      });
    }

    // Successfully deleted the saved post
    res.status(200).json({
      status: "success",
      message: "Post unsaved successfully",
    });
  } catch (error) {
    // Error handling
    res.status(400).json({
      status: "failed",
      message: error.message,
    });
  }
};

export const EditPost = async (req, res) => {
  try {
    const { postId } = req.params;

    const deletedPost = await PostModel.findByIdAndDelete(postId);
  } catch (error) {}
};

export const getPostDetails = async (req, res) => {
  try {
    const { postId } = req.params;
    console.log("h1");
    const post = await PostModel.findById(postId)
      .populate("user", "username email profile_image") // adjust fields
      .populate({
        path: "comments",
        populate: {
          path: "user",
          select: "username profile_image", // adjust fields
        },
        options: { sort: { createdAt: -1 } },
      })
      .populate({
        path: "likes",
        populate: {
          path: "user",
          select: "username profile_image", // adjust fields
        },
      });

    if (!post) {
      return res.status(404).json({
        success: false,
        message: "Post not found",
      });
    }

    res.status(200).json({
      success: true,
      post,
      totalComments: post.comments.length,
      totalLikes: post.likes.length,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Server Error",
    });
  }
};
