import { saveModel } from "../models/followModel.js";
import MessageModel from "../models/messageModel.js";
import PostModel from "../models/postModel.js";
import UserModel from "../models/userModel.js";
import { v2 as cloudinary } from "cloudinary";

export const getUser = async (req, res) => {
  try {
    // console.log(req.user._id)
    const user = await UserModel.findById({ _id: req.user._id })
      .populate({
        path: "posts",
        populate: [
          { path: "likes", select: "username" },
          { path: "comments", select: "text username" },
        ],
      })
      .populate("followers")
      .populate("followings")
      .populate("savedPosts")
    // console.log(user)
    res.status(200).json({
      status: "success",
      result: {
        user,
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

    // Check for bio in request body
    if (req.body.bio) {
      updateData.bio = req.body.bio;
    }

    // Check if profile_image is provided in req.files
    if (req.files && req.files.profile_image) {
      const profile_image = req.files.profile_image;
      const result = await cloudinary.uploader.upload(
        profile_image.tempFilePath,
        {
          public_id: `user-coverImage-${Date.now()}`,
          transformation: [
            { width: 500, height: 500, crop: "auto", gravity: "auto" }, // Auto-crop and resize
            { fetch_format: "auto", quality: "auto" }, // Optimize format and quality
          ],
        }
      );
      updateData.profile_image = result.secure_url;
    }

    // Check if cover_image is provided in req.files
    if (req.files && req.files.cover_image) {
      const cover_image = req.files.cover_image;
      const result = await cloudinary.uploader.upload(
        cover_image.tempFilePath,
        {
          public_id: `user-coverImage-${Date.now()}`,
          transformation: [
            { width: 500, height: 500, crop: "auto", gravity: "auto" }, // Auto-crop and resize
            { fetch_format: "auto", quality: "auto" }, // Optimize format and quality
          ],
        }
      );
      updateData.cover_image = result.secure_url;
    }

    const updatedUser = await UserModel.findByIdAndUpdate(
      { _id: req.user._id },
      updateData,
      { new: true, runValidators: true }
    );

    if (!updatedUser) {
      res.status(400).json({
        status: "failed",
        message: "user not found",
      });
    }

    res.status(200).json({
      status: "success",
      message: "User updated successfully",
      data: updatedUser,
    });
  } catch (error) {
    res.status(401).json({
      status: "failed",
      message: error.message,
    });
  }
};

export const getUserByUserId = async (req, res) => {
  try {
    const { userId } = req.params;
    // console.log(userId);

    // Fetch the user details first
    const user = await UserModel.findById(userId)
      .select("-password -__v")
      .populate("followers") // Populate followers
      .populate("followings"); // Assuming you don't want to send back the password

    if (!user) {
      return res
        .status(404)
        .json({ status: "failed", message: "User not found" });
    }

    // Fetch the posts associated with the user
    const userPosts = await PostModel.find({ user: userId }) // Correct usage of `find` to find posts by the user
      .populate({
        path: "comments",
        select: "id", // Populate comments but exclude unnecessary fields
      })
      .populate({
        path: "likes",
        select: "id", // Populate likes but exclude unnecessary fields
      })

      .select("-__v") // Exclude __v field from posts
      .sort({ createdAt: -1 }); // Sort by creation date

      const savedPosts = await saveModel.find({user:userId}).populate({
         path:"post",
        select:"_id image",
        populate: [
          { path: "likes", select: "username" },
          { path: "comments", select: "text username" },
        ],
      }).select("post")

    res.status(200).json({
      status: "success",
      user: {
        id: user._id,
        name: user.name,
        username: user.username,
        profile_image: user.profile_image,
        cover_image: user.cover_image,
        bio: user.bio,
        posts: userPosts,
        savedPosts:savedPosts,
        followers: user.followers, // Send followers
        followings: user.followings,
        // Any other fields you want to return from the user
      },
    });
  } catch (error) {
    res.status(500).json({
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
      "_id username profile_image"
    );
    // console.log(allUsers);
    // Filter users who are not in the current user's following list
    // and who are not already following the current user
    const suggestedPeople = allUsers.filter((user) => {
      return !currentUser.followings.some(
        (followedUser) => followedUser.following.toString() === user.id
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
    const {username} = req.body;
    // console.log(username)
    const searchingUser = await UserModel.find({username}); 
    // console.log(searchingUser)
    if (searchingUser.length === 0) {
      return res
        .status(404)
        .json({ status: "failed", message: "User not found" });
    }

    return res
      .status(200)
      .json({ status: "success", result:searchingUser });
  } catch (error) {
    res.status(500).json({ message: "Something went wrong." });
  }
};


export const listPeople = async (req,res) => {
   try {
      const allMessagesOfUser = await MessageModel.find({
        $or :[
           {sender:req.user._id},
           {receiver:req.user._id},
        ]
      }).populate({
        path:"sender",
        select:"_id username profile_image"
      }).populate({
        path:"receiver",
        select:"_id username profile_image"
      })

      // console.log(allMessagesOfUser)
      let allUsers = {};

      // Loop through all the messages and group by the other user (not `req.user._id`)
      allMessagesOfUser.forEach((m) => {
        const otherUser = m.sender.id === req.user._id.toString() ? m.receiver : m.sender;
      
        // Check if this user is already in the allUsers object
        if (!allUsers[otherUser.id]) {
          allUsers[otherUser.id] = {
            user: otherUser, // Store the user object
            lastMessage: m // Store the first message as the last one (will be replaced later)
          };
        } else {
          // Replace the last message if the current one is newer
          if (new Date(m.createdAt) > new Date(allUsers[otherUser.id].lastMessage.createdAt)) {
            allUsers[otherUser.id].lastMessage = m;
          }
        }
      });
      
      // Convert the result into an array of users with their last messages
      const usersWithLastMessages = Object.values(allUsers);
      
      // console.log(usersWithLastMessages);
      
  res.status(200).json({status:"success",users:usersWithLastMessages})

   } catch (error) {
    res.status(500).json({status:"failed",message:error.message})
   }
}


export const getSavedPost = async (req,res) => {
    try {
       const userId= req.user._id

       const savedPost = await saveModel.find({user:userId}).populate({
        path: "post",
        select:"_id image",
        populate: [
          { path: "likes", select: "username" },
          { path: "comments", select: "text username" },
        ],
      })
       
       return res
      .status(200)
      .json({ status: "success", result:savedPost });
    } catch (error) {
      res.status(500).json({status:"failed",message:error.message})
    }
}

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
      activePeopleExceptUser.includes(user.id)
    );
    // console.log('activePeople', activePeople);

    // Return the active people
    res.status(200).json({ status: "success", activePeople });
  } catch (error) {
    console.error('Error:', error.message);
    res.status(500).json({ status: "failed", message: error.message });
  }
};
