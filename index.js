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
mongoose
  .connect(process.env.DATABASE_URI)
  .then(() => console.log("Database is connected"))
  .catch((err) => console.error("Error is : ", err));

// Middlewares
app.use(
  fileUpload({
    useTempFiles: true,
  })
);
app.use(express.json());

app.use(
  cors({
    origin: "http://localhost:5173",
    methods: "GET,HEAD,PUT,PATCH,POST,DELETE",
    credentials: true,
    optionsSuccessStatus: 200,
  })
);

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

io.on("connection", (socket) => {
  socket.on("user-joined", (userId) => {
    users[userId] = socket.id;
    console.log(users);
    console.log(`${userId} user connected with socket ID ${socket.id}`);
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

  socket.on("send-message", ({ senderId, receiverId, message }) => {
    console.log("send message");
    // console.log(receiverId);
    // console.log(users);
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
    console.log(`User disconnected: ${socket.id}`);
  });
});

const PORT = process.env.PORT || 8000;
server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
