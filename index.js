import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import morgan from "morgan";
import mongoose from "mongoose";
import { Server } from "socket.io"; // Importing Socket.IO
import fileUpload from "express-fileupload";
import http from "http"; // Required for Socket.IO integration
import userRoutes from "./routes/userRoutes.js";
import postRoutes from "./routes/postRoutes.js";
import { time } from "console";

dotenv.config();
const app = express();

// DATABASE CONNECTION
const DB = process.env.NODE_ENV === "development" ? process.env.DATABASE_LOCAL : process.env.DATABASE_URI;
// console.log(DB);
mongoose
  .connect(DB)
  .then(() => console.log("Database is connected"))
  .catch((err) => console.error("Error is : ", err));

// Middlewares
app.use(
  fileUpload({
    useTempFiles: true,
  })
);
app.use(express.json());


const ALLOWED_ORIGIN = process.env.NODE_ENV === "development" ? "http://localhost:3000" : "https://sky-social.vercel.app";
console.log(ALLOWED_ORIGIN)
app.use(cors({
  origin: ALLOWED_ORIGIN,
  methods: "GET,HEAD,PUT,PATCH,POST,DELETE",
  credentials: true,
  optionsSuccessStatus: 200,
}));


if (process.env.NODE_ENV === "development") {
  app.use(morgan("dev"));
}

app.get('/', (req, res) => {
  res.send('Hello World, from express');
})

// Routes
app.use("/api/v1/users", userRoutes);
app.use("/api/v1/posts", postRoutes);

// Create HTTP server for Socket.IO integration
const server = http.createServer(app);

// Socket.IO setup
let users = {};
const io = new Server(server, {
  cors: {
    origin: "http://localhost:3000",
    allowedHeaders: ["Content-Type", "Authorization"],
    methods: ["GET", "POST"],
    credentials: true,
  },
});
let activePeople =new Map();
io.on("connection", (socket) => {
  socket.on("user-joined", (userId) => {
    // users[userId] = socket.id;
    // activePeople.push(userId)
    activePeople.set(userId, socket.id);

    console.log("activePeople",activePeople);

    io.emit("active-people", {
      people: Array.from(activePeople.keys()), // send userIds only
    });
    
    console.log(`${userId} user connected with socket ID ${socket.id}`);
    
  });

  socket.on("likePost", (data) => {
     const receiverSocketId = activePeople.get(data.userId);
     const type = data.action === "Post liked" ? "like" : "unlike";
     const message = data.action === "Post liked" ? `${data.username} liked your post` : `${data.username} unliked your post`;

    if (receiverSocketId) {
      io.to(receiverSocketId).emit("receiveNotification", {
        type: "like",
        message: message,
      });
    }
  });
  socket.on("commentOnPost", (data) => {
    const receiverSocketId = activePeople.get(data.userId);
    if (receiverSocketId) {
      io.to(receiverSocketId).emit("receiveNotification", {
        type: "comment",
        message: `${data.username} commented on your post ${data.message}`,
      });
    }
  });

  socket.on("followAndUnfollowUser", (data) => {
    const receiverSocketId = activePeople.get(data.userId);
    const type = data.action === "Followed successfully" ? "follow" : "unfollow";
     const message = data.action === "Followed successfully" ? `${data.username} followed you` : `${data.username} unfollowed you`;
    if (receiverSocketId) {
      io.to(receiverSocketId).emit("receiveNotification", {
        type: "follow",
        message: message,
      });
    }
  });

    socket.on("typing", ({ senderId, receiverId }) => {
     const receiverSocketId = activePeople.get(receiverId);
    if (receiverSocketId) {
      io.to(receiverSocketId).emit("typing", { senderId });
    }
  });

  socket.on("stop-typing", ({ senderId, receiverId }) => {
    const receiverSocketId = activePeople.get(receiverId);
    if (receiverSocketId) {
      io.to(receiverSocketId).emit("stop-typing", { senderId });
    }
  });

    socket.on("messages-seen", ({ senderId, receiverId }) => {
    const senderSocket = activePeople.get(senderId);

    if (senderSocket) {
      io.to(senderSocket).emit("messages-seen", {
        senderId: receiverId,
      });
    }

    // 👉 Optional: update DB
    // await Message.updateMany(
    //   { sender: senderId, receiver: receiverId, seen: false },
    //   { seen: true }
    // );
  });

  socket.on("accept-invite",(data) => {
    // console.log(data);
    const receiverSocketId = users[data._id];
    // console.log(data.currentUser)
    if (receiverSocketId) {
      io.to(receiverSocketId).emit("acceptInvite", {
        type: "accept",
        receiverId:data._id,
        receiver:data.username,
        sender:data.currentUserId,
        message: `${data.currentUser} invites you for game`,
      });
    }
  })

  socket.on("reject-invite",(data) => {
    // console.log(data);
    const receiverSocketId = users[data.receiver];
    // console.log(data.currentUser)
    if (receiverSocketId) {
      io.to(receiverSocketId).emit("rejectInvite", {
        type: "reject",
        message: `${data.sender} rejects your Invitation`,
      });
    }
  })

  socket.on("join-room", ({ roomId, sender, receiver }) => {
    // Notify both sender and receiver to join the room
    console.log('roomId',roomId);
    console.log('sender',sender);
    console.log('receiver',receiver);
    io.to(receiver).emit("room-join", roomId);
    io.to(sender).emit("room-join", roomId);
   

    // Optionally, add logic to join the socket to the room
    socket.join(roomId);
  });

  socket.on("send-group-message",({sender,receivers,message,profile_image,username,timestamp}) => {
     console.log(sender,receivers,message,timestamp,profile_image,username);
     for(let receiver in receivers){
      console.log('receiver',receiver);
      const receiverSocketId = users[receivers[receiver].memberId];
      if (receiverSocketId) {
        io.to(receiverSocketId).emit("receive-message", {
          sender,
          message,
          profile_image,
          username,
          createdAt:timestamp
        });
      }
     }
  })

  socket.on("box-clicked", (data) => {
    socket.broadcast.emit("box-clicked", data); // Broadcast to all other users
  });

  socket.on("send-message", ({ sender, receiver, message }) => {
    console.log("send message");
  
    const receiverSocketId = activePeople.get(receiver);
  
    if (receiverSocketId) {
      io.to(receiverSocketId).emit("receive-message", {
        sender,
        receiver,
        message,
        createdAt: new Date(),
      });
    } else {
      console.log("User is offline");
    }
  });
  // Handle private messaging between two users

  // Handle user disconnection
  socket.on("disconnect", () => {
    for (let [userId, socketId] of activePeople.entries()) {
      if (socketId === socket.id) {
        activePeople.delete(userId);
        break;
      }
    }
  
    io.emit("active-people", {
      people: Array.from(activePeople.keys()),
    });
  
    // activePeople.pop(userId)
    console.log(`User disconnected: ${socket.id}`);
  });
});

const PORT = process.env.PORT || 8000;
server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
