import mongoose from "mongoose";
import LikeModel from "../models/likeModels.js";
import PostModel from "../models/postModel.js";

export const handleLikes = async (req, res) => {
  try {
    const { postId } = req.params;
    const userId = req.user._id;

    // Check if the user has already liked the post
    const existingLike = await LikeModel.findOne({
      post: postId,
      user: userId,
    });
    
    if (existingLike) {
      // Unlike the post by deleting the like
      await LikeModel.findByIdAndDelete(existingLike._id);

      return res.status(200).json({ message: 'Post unliked',like:{
        user:userId
      } });
    } else {
      // Like the post by creating a new like document
      let like = await LikeModel.create({ user: userId, post: postId });
      
      // Populate the user and post fields in the response
    //   like = await like.populate('user').populate('post').execPopulate();

      return res.status(200).json({ message: 'Post liked', like });
    }
  } catch (error) {
    return res.status(500).json({ message: 'Internal server error', error: error.message });
  }
};
