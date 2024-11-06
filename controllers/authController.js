import {promisify} from "util"
import jwt from "jsonwebtoken";
import cloudinary from './../utils/CloudinaryConfig.js';
import UserModel from "../models/userModel.js";
import bcrypt from "bcryptjs"

const signToken = (id) => {
  return jwt.sign({ id }, process.env.SECRET, {
    expiresIn: process.env.EXPIRES_IN,
  });
};

export const signup = async (req, res) => {
  try {

    if (!req.files || !req.files.profile_image || !req.files.cover_image) {
      return res
        .status(400)
        .json({ status: "failed", message: "Image is required" });
    }
    
    const profile_image = req.files.profile_image;
    const cover_image = req.files.cover_image;
   
    const uploadProfileImage = await cloudinary.uploader.upload(profile_image.tempFilePath, {
      public_id: `user-profileImage-${Date.now()}`,
      transformation: [
        { width: 500, height: 500, crop: "auto", gravity: "auto" }, // Auto-crop and resize
        { fetch_format: "auto", quality: "auto" }, // Optimize format and quality
      ],
    });
    
    const uploadCoverImage = await cloudinary.uploader.upload(cover_image.tempFilePath, {
      public_id: `user-coverImage-${Date.now()}`,
      transformation: [
        { width: 500, height: 500, crop: "auto", gravity: "auto" }, // Auto-crop and resize
        { fetch_format: "auto", quality: "auto" }, // Optimize format and quality
      ],
    });

    if (!uploadProfileImage || !uploadProfileImage.secure_url || !uploadCoverImage || !uploadCoverImage.secure_url ) {
      return res
        .status(400)
        .json({ status: "failed", message: "Image upload failed" });
    }
    
    const newUser = await UserModel.create({
      name:req.body.name,
      username: req.body.username,
      email: req.body.email,
      password: req.body.password,
      profile_image: uploadProfileImage.secure_url,
      cover_image:uploadCoverImage.secure_url,
    });
    
    console.log(newUser);
    const authToken = signToken(newUser._id);

    res.status(201).json({
      status: "success",
      authToken,
      result: {
        user: newUser,
      },
    });
  } catch (error) {
    res.status(400).json({
      status: "error",
      message: error.message,
    });
  }
};

export const login = async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res
        .status(400)
        .json({
          status: "failed",
          message: "please provide complete credentials",
        });
    }

    const user = await UserModel.findOne({ username })
  .select("+password")  
  .populate('posts followings followers')   
  // .populate('followings')
  // .populate('followers');

    if(!user){
        return res
        .status(400)
        .json({
          status: "failed",
          message: "please provide valid credentials",
        });
    }
    
    const isMatch = await bcrypt.compare(password,user.password)
    if(!isMatch){
        return res
        .status(400)
        .json({
          status: "failed",
          message: "please provide valid credentials",
        });
    }

    const authToken = signToken(user._id);
    // console.log(user);

    res.status(200).json({
      status: "success",
      authToken,
      result: {
        user,
      },
    });
  } catch (error) {
    res.status(400).json({
      status: "error",
      message: error.message,
    });
  }
};


export const protect  = async(req,res,next) => {
   let token ;
   if(req.headers.authorization && req.headers.authorization.startsWith("Bearer")){
  token = req.headers.authorization.split(' ')[1]
   }

   if(!token){
    return res
        .status(400)
        .json({
          status: "failed",
          message: "please check , user is not logged in",
        });
   }

   const decoded = await promisify(jwt.verify)(token,process.env.SECRET)
//   console.log(decoded.id)
   const currentUser = await UserModel.findById(decoded.id)
//    console.log(currentUser)
   if(!currentUser){
    return res
    .status(400)
    .json({
      status: "failed",
      message: "User doesn't exist",
    });
   }

   req.user = currentUser
   next()
}

export const updatePassword = async (req,res) => {
  try {
    const old_password = req.body.old_password
    const new_password = req.body.new_password
     const currentUser = await UserModel.findById({_id:req.user._id}).select("+password").populate('posts followings followers')  
      if(!currentUser){
         return res.status(404).json({status:"failed",message:"user not found"})
      }

      const isMatches = await bcrypt.compare(old_password,currentUser.password);
      
      if(!isMatches){
         return res.status(404).json({status:"failed",message:"please fill correct old password"})
      }
      // console.log('old',currentUser.password)
    currentUser.password = new_password
    await currentUser.save({ validateModifiedOnly: true })

    const authToken = signToken(currentUser._id);

    currentUser.password = undefined;
    res.status(201).json({
      status: "success",
      authToken,
      result: {
        user: currentUser,
      },
    });

    // console.log('new',currentUser.password)
  } catch (error) {
    res.status(500).json({
      status: "error",
      message: error.message,
    });
  }
}