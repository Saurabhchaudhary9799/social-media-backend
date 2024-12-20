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


const ALLOWED_ORIGIN = process.env.NODE_ENV === "development" ? "http://localhost:5173" : "https://sky-social.vercel.app";
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
    origin: "http://localhost:5173",
    allowedHeaders: ["Content-Type", "Authorization"],
    methods: ["GET", "POST"],
    credentials: true,
  },
});
let activePeople = [];
io.on("connection", (socket) => {
  socket.on("user-joined", (userId) => {
    users[userId] = socket.id;
    activePeople.push(userId)

    console.log(activePeople);
    const receiverSocketId = users[userId];
    console.log(users);
    console.log(`${userId} user connected with socket ID ${socket.id}`);
    if (receiverSocketId) {
      io.to(receiverSocketId).emit("active-people", {
        people:activePeople
      });
    }
  });

  socket.on("likePost", (data) => {
    const receiverSocketId = users[data.userId];
    if (receiverSocketId) {
      io.to(receiverSocketId).emit("receiveNotification", {
        type: "like",
        message: `${data.username} ${data.action} your post`,
      });
    }
  });
  socket.on("commentOnPost", (data) => {
    const receiverSocketId = users[data.userId];
    if (receiverSocketId) {
      io.to(receiverSocketId).emit("receiveNotification", {
        type: "comment",
        message: `${data.username} commented your post`,
      });
    }
  });

  socket.on("followAndUnfollowUser", (data) => {
    const receiverSocketId = users[data.userId];
    if (receiverSocketId) {
      io.to(receiverSocketId).emit("receiveNotification", {
        type: "follow",
        message: `${data.username} ${data.action} you`,
      });
    }
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

  socket.on("box-clicked", (data) => {
    socket.broadcast.emit("box-clicked", data); // Broadcast to all other users
  });

  socket.on("send-message", ({ senderId, receiverId, message }) => {
    console.log("send message");
    console.log(receiverId);
    console.log(users);
    const receiverSocketId = users[receiverId];
    // console.log(receiverSocketId);
    if (receiverSocketId) {
      // Send message to the receiver

      io.to(receiverSocketId).emit("receive-message", {
        senderId,
        message,
      });
    } else {
      console.log("User is offline or not connected");
    }
  });
  // Handle private messaging between two users

  // Handle user disconnection
  socket.on("disconnect", () => {
    // activePeople.pop(userId)
    console.log(`User disconnected: ${socket.id}`);
  });
});

const PORT = process.env.PORT || 8000;
server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
