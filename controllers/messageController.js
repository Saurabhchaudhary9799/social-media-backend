import mongoose from "mongoose";
import MessageModel from "../models/messageModel.js"

export const sendMessage = async (req,res) => {
    try {
        const {receiverId} = req.params
        const senderId = req.user._id
// console.log(senderId,receiverId)

if (receiverId === senderId.toString()) {
    return res.status(400).json({ message: "You cannot send message yourself" });
  }
        const newMessage = await MessageModel.create({
            message:req.body.message,
            sender:senderId,
            receiver:receiverId
        })


        res.status(201).json({
            status: "success",
            result: {
              message: newMessage,
            },
          });
    } catch (error) {
        res.status(400).json({
            status: "failed",
            message: error.message,
          });
    }
}


export const allMessage = async (req,res) => {
    try {
        const {receiverId} = req.params
        const senderId = req.user._id

        const allMessages = await MessageModel.find({$or:[
            {$and: [
                {sender:senderId},
                {receiver:receiverId}
            ]},
            {$and: [
                {sender:receiverId},
                {receiver:senderId}
            ]}
        ]}).sort({ createdAt: 1 });

        // console.log(allMessages)

        res.status(201).json({
            status: "success",
            result: {
              allMessages,
            },
          });
    } catch (error) {
        res.status(400).json({
            status: "failed",
            message: error.message,
          });
    }
}

export const getUserConversations = async (req,res) => {
    try {
        const { userId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ message: "Invalid userId" });
    }

    const objectUserId = new mongoose.Types.ObjectId(userId);

    console.log(objectUserId);
    const conversations = await MessageModel.aggregate([
        // 1. Get messages where user is sender OR receiver
        {
          $match: {
            $or: [
              { sender: objectUserId },
              { receiver: objectUserId },
            ],
          },
        },
  
        // 2. Sort latest first
        {
          $sort: { createdAt: -1 },
        },
  
        // 3. Group by "other user"
        {
          $group: {
            _id: {
              $cond: [
                { $eq: ["$sender", objectUserId] },
                "$receiver",
                "$sender",
              ],
            },
            lastMessage: { $first: "$message" },
            createdAt: { $first: "$createdAt" },
          },
        },
  
        // 4. Get user details
        {
          $lookup: {
            from: "users",
            localField: "_id",
            foreignField: "_id",
            as: "user",
          },
        },
  
        {
          $unwind: "$user",
        },
  
        // 5. Final shape
        {
          $project: {
            _id: 0,
            userId: "$user._id",
            username: "$user.username",
            name: "$user.name",
            profile_image: "$user.profile_image",
            lastMessage: 1,
            createdAt: 1,
          },
        },
  
        // 6. Sort conversations again (important)
        {
          $sort: { createdAt: -1 },
        },
      ]);
  console.log(conversations);
      return res.status(200).json(conversations);
      
    } catch (error) {
        console.error(error);
    }
}

