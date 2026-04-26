import express from "express"
import  {forgotPassword, login, logout, protect, refreshToken, resetPassword, signup, updatePassword}  from "../controllers/authController.js"
import {    getActivePeople, getAllChatsOfGroup, getCommunityMembers, getFollowersByUserId, getFollowingsByUserId, getPostsByUserId, getSavedPost, getSavedPostsByUserId, getUser, getUserByUserId, listPeople, listSuggestedPeople, searchUser, sendMessageInGroup, updateLocation, updateUser } from "../controllers/userController.js"
import followRoutes from "./followRoutes.js"; 
import messageRoutes from "./messageRoutes.js"; 
import { getUserConversations } from "../controllers/messageController.js";
const router = express.Router()

router.route('/signup').post((signup))
router.route('/login').post((login))
router.route('/logout').post((logout))

router.use("/:userId/follower",followRoutes)
router.use("/messages",messageRoutes)
// router.use("/:userId",messageRoutes);
// router.get("/:userId/conversations", protect, getUserConversations);

router.post("/forgot-password", forgotPassword);
router.post("/reset-password", resetPassword);

router.use(protect)
router.route('/me').get((getUser)).patch((updateUser))

router.route("/updatePassword").patch(updatePassword)
router.route("/suggested-people").get((listSuggestedPeople))
router.route("/search-user").get(searchUser)
router.route("/refresh-token").post(refreshToken)
router.route("/save").get(getSavedPost)
router.route("/listPeople").get(listPeople)
router.route("/updateLocation").post(updateLocation)
router.route("/get-community-members").get(getCommunityMembers);
router.route("/send-message-in-group").post(sendMessageInGroup);
router.route("/get-messages-of-group").get(getAllChatsOfGroup);
router.route("/active-people/:userId").post(getActivePeople)
router.route("/:userId/posts").get(getPostsByUserId)
router.route("/:userId/saved-posts").get(getSavedPostsByUserId)
router.route("/:userId/followers").get(getFollowersByUserId)
router.route("/:userId/followings").get(getFollowingsByUserId)
router.route("/:userId").get(getUserByUserId)


export default router
