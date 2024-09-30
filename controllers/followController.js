import { FollowingModel, FollowerModel } from "../models/followModel.js";
import UserModel from "../models/userModel.js";

// Follow/Unfollow API
export const handleFollowUnfollow = async (req, res) => {
  try {
    const { userId } = req.params; // The user to follow/unfollow
    const followerId = req.user._id; // The current logged-in user
console.log(userId,followerId)
    // Ensure that user cannot follow themselves
    if (userId === followerId.toString()) {
      return res.status(400).json({ message: "You cannot follow yourself" });
    }

    // Check if already following
    const isFollowing = await FollowingModel.findOne({
      following: userId,
      user: followerId,
    });

    if (isFollowing) {
      // Unfollow logic: remove from both collections
      await FollowingModel.deleteOne({ following: userId, user: followerId });
      await FollowerModel.deleteOne({ user: userId, follower: followerId });

      return res.status(200).json({ message: "Unfollowed successfully" });
    } else {
      // Follow logic: add to both collections
      await FollowingModel.create({ following: userId, user: followerId });
      await FollowerModel.create({ user: userId, follower: followerId });

      return res.status(200).json({ message: "Followed successfully" });
    }
  } catch (error) {
    console.error("Error in follow/unfollow:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};
