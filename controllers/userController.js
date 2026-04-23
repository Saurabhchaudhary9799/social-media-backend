import Community from "../models/communityModel.js";
import {
  FollowerModel,
  FollowingModel,
  saveModel,
} from "../models/followModel.js";
import MessageModel from "../models/messageModel.js";
import PostModel from "../models/postModel.js";
import UserModel from "../models/userModel.js";
import { v2 as cloudinary } from "cloudinary";

export const getUser = async (req, res) => {
  try {
    const user = await UserModel.findById(req.user._id).select(
      "_id name username email profile_image cover_image bio",
    );

    if (!user) {
      return res.status(404).json({
        status: "failed",
        message: "User not found",
      });
    }

    const [postsCount, followersCount, followingsCount, savedPostsCount] =
      await Promise.all([
        PostModel.countDocuments({ user: req.user._id }),
        FollowerModel.countDocuments({ user: req.user._id }),
        FollowingModel.countDocuments({ user: req.user._id }),
        saveModel.countDocuments({ user: req.user._id }),
      ]);

    res.status(200).json({
      status: "success",
      user: {
        ...user.toObject(),

        posts: postsCount,
        followers: followersCount,
        followings: followingsCount,
        savedPosts: savedPostsCount,
      },
    });
  } catch (error) {
    res.status(401).json({
      status: "failed",
      message: error,
    });
  }
};

export const updateUser = async (req, res) => {
  try {
    const updateData = {};

    if (req.body.name) updateData.name = req.body.name;
    if (req.body.username) updateData.username = req.body.username;
    if (req.body.bio) updateData.bio = req.body.bio;

    // ✅ images come directly as URL
    if (req.body.profile_image) {
      updateData.profile_image = req.body.profile_image;
    }

    if (req.body.cover_image) {
      updateData.cover_image = req.body.cover_image;
    }

    const updatedUser = await UserModel.findByIdAndUpdate(
      req.user._id,
      updateData,
      { new: true, runValidators: true }
    ).select("-password");

    if (!updatedUser) {
      return res.status(404).json({
        status: "failed",
        message: "User not found",
      });
    }

    return res.status(200).json({
      status: "success",
      data: updatedUser,
    });
  } catch (error) {
    return res.status(500).json({
      status: "failed",
      message: error.message,
    });
  }
};

export const getUserByUserId = async (req, res) => {
  try {
    const { userId } = req.params;
    const user = await UserModel.findById(userId).select(
      "_id name username profile_image cover_image bio",
    );

    if (!user) {
      return res
        .status(404)
        .json({ status: "failed", message: "User not found" });
    }

    const [postsCount, followersCount, followingsCount, savedPostsCount] =
      await Promise.all([
        PostModel.countDocuments({ user: userId }),
        FollowerModel.countDocuments({ user: userId }),
        FollowingModel.countDocuments({ user: userId }),
        saveModel.countDocuments({ user: userId }),
      ]);

    res.status(200).json({
      status: "success",
      user: {
        ...user.toObject(),

        posts: postsCount,
        followers: followersCount,
        followings: followingsCount,
        savedPosts: savedPostsCount,
      },
    });
  } catch (error) {
    res.status(500).json({
      status: "failed",
      message: error.message,
    });
  }
};

export const getPostsByUserId = async (req, res) => {
  try {
    const { userId } = req.params;
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const [posts, totalPosts] = await Promise.all([
      PostModel.find({ user: userId })
        .populate({
          path: "comments",
          select: "text username",
        })
        .populate({
          path: "likes",
          select: "username",
        })
        .select("-__v")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      PostModel.countDocuments({ user: userId }),
    ]);

    return res.status(200).json({
      status: "success",
      result: posts,
      pagination: {
        page,
        limit,
        total: totalPosts,
        totalPages: Math.ceil(totalPosts / limit),
      },
    });
  } catch (error) {
    return res.status(500).json({
      status: "failed",
      message: error.message,
    });
  }
};

export const getSavedPostsByUserId = async (req, res) => {
  try {
    const { userId } = req.params;
    console.log(userId);

    const savedPosts = await saveModel.find({ user: userId }).populate({
      path: "post",
      select: "_id image bio user createdAt",
      populate: [
        { path: "likes", select: "username" },
        { path: "comments", select: "text username" },
      ],
    });

    return res.status(200).json({
      status: "success",
      result: savedPosts,
    });
  } catch (error) {
    return res.status(500).json({
      status: "failed",
      message: error.message,
    });
  }
};

export const getFollowersByUserId = async (req, res) => {
  try {
    const { userId } = req.params;

    const followers = await FollowerModel.find({ user: userId })
      .populate({
        path: "follower",
        select: "_id name username profile_image bio",
      })
      .select("_id follower");

    return res.status(200).json({
      status: "success",
      result: followers,
    });
  } catch (error) {
    return res.status(500).json({
      status: "failed",
      message: error.message,
    });
  }
};

export const getFollowingsByUserId = async (req, res) => {
  try {
    const { userId } = req.params;

    const followings = await FollowingModel.find({ user: userId })
      .populate({
        path: "following",
        select: "_id name username profile_image bio",
      })
      .select("_id following");

    return res.status(200).json({
      status: "success",
      result: followings,
    });
  } catch (error) {
    return res.status(500).json({
      status: "failed",
      message: error.message,
    });
  }
};

export const listSuggestedPeople = async (req, res) => {
  try {
    const userId = req.user._id;

    // Find the current user and populate their 'following' array
    const currentUser = await UserModel.findById(userId)
      .populate("followings")
      .select("followings");

    if (!currentUser) {
      return res.status(404).json({ message: "User not found" });
    }
    // console.log(currentUser);
    // Find all users except the current user
    const allUsers = await UserModel.find({ _id: { $ne: userId } }).select(
      "_id username profile_image",
    );
    // console.log(allUsers);
    // Filter users who are not in the current user's following list
    // and who are not already following the current user
    const suggestedPeople = allUsers.filter((user) => {
      return !currentUser.followings.some(
        (followedUser) => followedUser.following.toString() === user.id,
      );
    });

    // console.log(suggestedPeople)
    res.status(200).json(suggestedPeople);
  } catch (error) {
    console.error("Error in listSuggestedPeople:", error);
    res.status(500).json({ message: "Something went wrong." });
  }
};

export const searchUser = async (req, res) => {
  try {
    console.log(req.query);
    const { username } = req.query; // ✅ use query for search
    console.log(username);
    if (!username || username.trim() === "") {
      return res.status(200).json({ status: "success", result: [] });
    }
    console.log("h1");
    const users = await UserModel.find({
      username: { $regex: username, $options: "i" }, // 🔥 partial + case insensitive
    }).limit(10); // ✅ limit results (important for performance)

    return res.status(200).json({
      status: "success",
      result: users,
    });
  } catch (error) {
    res.status(500).json({ message: "Something went wrong." });
  }
};

export const listPeople = async (req, res) => {
  try {
    const allMessagesOfUser = await MessageModel.find({
      $or: [{ sender: req.user._id }, { receiver: req.user._id }],
    })
      .populate({
        path: "sender",
        select: "_id username profile_image",
      })
      .populate({
        path: "receiver",
        select: "_id username profile_image",
      });

    // console.log(allMessagesOfUser)
    let allUsers = {};

    // Loop through all the messages and group by the other user (not `req.user._id`)
    allMessagesOfUser.forEach((m) => {
      const otherUser =
        m.sender.id === req.user._id.toString() ? m.receiver : m.sender;

      // Check if this user is already in the allUsers object
      if (!allUsers[otherUser.id]) {
        allUsers[otherUser.id] = {
          user: otherUser, // Store the user object
          lastMessage: m, // Store the first message as the last one (will be replaced later)
        };
      } else {
        // Replace the last message if the current one is newer
        if (
          new Date(m.createdAt) >
          new Date(allUsers[otherUser.id].lastMessage.createdAt)
        ) {
          allUsers[otherUser.id].lastMessage = m;
        }
      }
    });

    // Convert the result into an array of users with their last messages
    const usersWithLastMessages = Object.values(allUsers);

    // console.log(usersWithLastMessages);

    res.status(200).json({ status: "success", users: usersWithLastMessages });
  } catch (error) {
    res.status(500).json({ status: "failed", message: error.message });
  }
};

export const getSavedPost = async (req, res) => {
  try {
    const userId = req.user._id;

    const savedPost = await saveModel.find({ user: userId }).populate({
      path: "post",
      select: "_id image",
      populate: [
        { path: "likes", select: "username" },
        { path: "comments", select: "text username" },
      ],
    });

    return res.status(200).json({ status: "success", result: savedPost });
  } catch (error) {
    res.status(500).json({ status: "failed", message: error.message });
  }
};

export const getActivePeople = async (req, res) => {
  try {
    const { userId } = req.params;
    // console.log('userId', userId);

    const { people } = req.body; // Assume `people` is passed in the body.
    // console.log('people', people);

    // Filter out the current user ID from the people array
    const activePeopleExceptUser = people.filter((p) => p !== userId);
    // console.log('activePeopleExceptUser', activePeopleExceptUser);

    // Fetch all users
    const allUsers = await UserModel.find();
    // console.log('allUsers', allUsers);

    // Find the active people who are in the activePeopleExceptUser array
    const activePeople = allUsers.filter((user) =>
      activePeopleExceptUser.includes(user.id),
    );
    // console.log('activePeople', activePeople);

    // Return the active people
    res.status(200).json({ status: "success", activePeople });
  } catch (error) {
    console.error("Error:", error.message);
    res.status(500).json({ status: "failed", message: error.message });
  }
};

export const updateLocation = async (req, res) => {
  try {
    const { latitude, longitude } = req.body;

    // Validate latitude and longitude
    if (typeof latitude !== "number" || typeof longitude !== "number") {
      return res.status(400).json({
        status: "failed",
        message: "Invalid latitude or longitude",
      });
    }

    // Update user location
    const user = await UserModel.findByIdAndUpdate(
      req.user._id,
      {
        $set: {
          "location.x": latitude,
          "location.y": longitude,
        },
      },
      { new: true },
    );

    if (!user) {
      return res
        .status(404)
        .json({ status: "failed", message: "User not found" });
    }

    // Function to calculate distance using the Haversine formula
    const calculateDistance = (lat1, lon1, lat2, lon2) => {
      const R = 6371; // Earth's radius in km
      const dLat = ((lat2 - lat1) * Math.PI) / 180;
      const dLon = ((lon2 - lon1) * Math.PI) / 180;
      const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos((lat1 * Math.PI) / 180) *
          Math.cos((lat2 * Math.PI) / 180) *
          Math.sin(dLon / 2) *
          Math.sin(dLon / 2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      return R * c; // Distance in km

      // x
      // 32.9494528
      // y
      // 74.9910112
    };

    // Find a matching community
    const communities = await Community.find({}); // Fetch all communities
    let matchedCommunity = null;

    for (const community of communities) {
      for (const member of community.members) {
        const distance = calculateDistance(
          latitude,
          longitude,
          member.location.x,
          member.location.y,
        );
        // console.log('distance',distance);
        if (distance <= 5) {
          matchedCommunity = community;
          break;
        }
      }
      if (matchedCommunity) break;
    }
    console.log("matched", matchedCommunity);
    // If no matching community, create a new one
    if (!matchedCommunity) {
      // console.log(hello);
      matchedCommunity = new Community({
        members: [
          {
            memberId: user._id,
            name: user.name,
            username: user.username,
            email: user.email,
            profile_image: user.profile_image,
            cover_image: user.cover_image,
            location: {
              x: user.location.x,
              y: user.location.y,
            },
          },
        ],
      });

      await matchedCommunity.save();
    } else {
      // Add user to the matched community if not already a member
      if (
        !matchedCommunity.members.some(
          (member) => member.memberId === user._id.toString(),
        )
      ) {
        matchedCommunity.members.push({
          memberId: user._id,
          name: user.name,
          username: user.username,
          email: user.email,
          profile_image: user.profile_image,
          cover_image: user.cover_image,
          location: {
            x: user.location.x,
            y: user.location.y,
          },
        });
        await matchedCommunity.save();
      }
    }

    // Return updated user data and community information
    res.status(200).json({
      status: "success",
      message: "Location updated successfully",
      data: {
        user,
        community: {
          id: matchedCommunity._id,
        },
      },
    });
  } catch (error) {
    console.error("Error:", error.message);
    res.status(500).json({
      status: "failed",
      message: error.message,
    });
  }
};

export const getCommunityMembers = async (req, res) => {
  try {
    const userId = req.user._id;

    const communities = await Community.find({});
    let matchedCommunity = null;
    for (const community of communities) {
      for (const member of community.members) {
        const user = member.memberId === userId.toString();
        if (user) {
          matchedCommunity = community;
          break;
        }
      }
      if (matchedCommunity) break;
    }

    // console.log('matched',matchedCommunity)

    res.status(200).json({
      status: "success",
      members: matchedCommunity.members,
    });
  } catch (error) {
    console.error("Error:", error.message);
    res.status(500).json({
      status: "failed",
      message: error.message,
    });
  }
};

export const sendMessageInGroup = async (req, res) => {
  try {
    const userId = req.user._id;
    console.log(userId);
    const { message, timestamp, profile_image, username } = req.body;

    const communities = await Community.find({});
    console.log(communities);
    let matchedCommunity = null;
    for (const community of communities) {
      for (const member of community.members) {
        const user = member.memberId === userId.toString();
        if (user) {
          matchedCommunity = community;
          break;
        }
      }
      if (matchedCommunity) break;
    }
    // console.log(matchedCommunity);
    if (!matchedCommunity) {
      return res.status(404).json({
        status: "failed",
        message: "No matched community found",
      });
    } else {
      matchedCommunity.chats.push({
        message,
        sender: userId.toString(),
        createdAt: timestamp,
        profile_image,
        username,
      });
      await matchedCommunity.save();
    }

    res.status(201).json({
      status: "success",
      data: {
        message,
        sender: userId.toString(),
        profile_image,
        username,
        createdAt: timestamp,
      },
    });
  } catch (error) {
    res.status(500).json({
      status: "failed",
      message: error.message,
    });
  }
};

export const getAllChatsOfGroup = async (req, res) => {
  try {
    const userId = req.user._id;

    const communities = await Community.find({});
    let matchedCommunity = null;
    for (const community of communities) {
      for (const member of community.members) {
        const user = member.memberId === userId.toString();
        if (user) {
          matchedCommunity = community;
          break;
        }
      }
      if (matchedCommunity) break;
    }

    if (!matchedCommunity) {
      return res.status(404).json({
        status: "failed",
        message: "No matched community found",
      });
    }

    res.status(200).json({
      status: "success",
      messages: matchedCommunity.chats,
    });
  } catch (error) {
    res.status(500).json({
      status: "failed",
      message: error.message,
    });
  }
};
