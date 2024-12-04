import express from "express"
import  {login, protect, signup, updatePassword}  from "../controllers/authController.js"
import {    getActivePeople, getSavedPost, getUser, getUserByUserId, listPeople, listSuggestedPeople, searchUser, updateUser } from "../controllers/userController.js"
import followRoutes from "./followRoutes.js"; 
import messageRoutes from "./messageRoutes.js"; 
const router = express.Router()

router.route('/signup').post((signup))
router.route('/login').post((login))

router.use("/:userId/follower",followRoutes)
router.use("/:receiverId/message",messageRoutes)

router.use(protect)
router.route('/').get((getUser)).patch((updateUser))
router.route("/updatePassword").patch(updatePassword)
router.route("/suggested-people").get((listSuggestedPeople))
router.route("/search-user").post(searchUser)
router.route("/save").get(getSavedPost)
router.route("/listPeople").get(listPeople)
router.route("/active-people/:userId").post(getActivePeople)
router.route("/:userId").get(getUserByUserId)


export default router