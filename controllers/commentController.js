import CommentModel from "../models/commentModel.js";
import PostModel from "../models/postModel.js";
import mongoose from "mongoose";

export const createComment = async (req, res) => {
  try {
    const { postId } = req.params;
    const userId = req.user._id;
    console.log(userId, postId);

    const newComment = await CommentModel.create({
      message: req.body.message,
      post: postId,
      user: userId,
    });

    res.status(201).json({
      status: "success",
      result: {
        comment: newComment,
      },
    });
  } catch (error) {
    res.status(400).json({
      status: "failed",
      message: error.message,
    });
  }
};

export const getAllComments = async (req, res) => {
  try {
    const { postId } = req.params;

    const allComments = await CommentModel.find({ post: new mongoose.Types.ObjectId(postId) }).populate({
        path: 'user', // Populate the posts field
        select: 'username _id profile_image' // Only include the title from Post, exclude _id
      }).sort({ createdAt: -1 });

    if (!allComments.length) {
      return res.status(404).json({
        status: 'failed',
        message: 'No comments found for this post',
      });
    }

    res.status(200).json({
      status: 'success',
      data: allComments,
    });
  } catch (error) {
    res.status(400).json({
        status: "failed",
        message: error.message,
      });
  }
};


export const deleteComment = async(req,res) =>{
    try {
        const { commentId } = req.params;
    
        // Find the comment by its ID and delete it
        const deletedComment = await CommentModel.findByIdAndDelete(commentId);
    
        // If the comment is not found
        if (!deletedComment) {
          return res.status(404).json({
            status: 'failed',
            message: 'Comment not found',
          });
        }
    
        // Successfully deleted
        res.status(200).json({
          status: 'success',
          message: 'Comment deleted successfully',
        });
      } catch (error) {
        // Error handling
        res.status(400).json({
          status: 'failed',
          message: error.message,
        });
      }
    
}