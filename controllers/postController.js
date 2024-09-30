import cloudinary from "./../utils/CloudinaryConfig.js";
import PostModel from "../models/postModel.js";
import { saveModel } from "../models/followModel.js";
import UserModel from "../models/userModel.js";

export const createPost = async (req, res) => {
  try {
    const userId = req.user._id;
    const tagsString = req.body.tags;
    const tagsArray = tagsString?.split(",");
    console.log(tagsArray);
    // console.log("userId", userId);

    // console.log(req.files);
    if (!req.files || !req.files.image) {
      return res
        .status(400)
        .json({ status: "failed", message: "Image is required" });
    }
    const image = req.files.image;
    // console.log("image", image);
    const uploadResult = await cloudinary.uploader.upload(image.tempFilePath, {
      public_id: `user-${userId}-${Date.now()}`,
      transformation: [
        { width: 500, height: 500, crop: "auto", gravity: "auto" }, // Auto-crop and resize
        { fetch_format: "auto", quality: "auto" }, // Optimize format and quality
      ],
    });
    // console.log(uploadResult);
    if (!uploadResult || !uploadResult.secure_url) {
      return res
        .status(400)
        .json({ status: "failed", message: "Image upload failed" });
    }

    const newPost = await PostModel.create({
      bio: req.body.bio,
      user: userId,
      image: uploadResult.secure_url,
      tags: tagsArray,
    });

    res.status(201).json({
      status: "success",

      post: newPost,
    });
  } catch (error) {
    res.status(400).json({
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
      .sort({ createdAt: -1 })
      

    allPosts.forEach((post) => {
      post.comments.sort(
        (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
      );
    });

    const FeedPosts = allPosts.filter((post) => {
      return allFollowings.followings.some(
        (followedUser) => followedUser.following.toString() === post.user?.id
       
      );
    });
  
    // console.log(FeedPosts)
const posts = FeedPosts.slice(skip,skip+limit)
    
    res.status(200).json({
      status: "success",
      total:posts.length,
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
