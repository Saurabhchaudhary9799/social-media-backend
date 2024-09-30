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

