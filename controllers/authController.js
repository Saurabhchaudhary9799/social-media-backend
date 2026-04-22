import {promisify} from "util"
import jwt from "jsonwebtoken";
import UserModel from "../models/userModel.js";
import bcrypt from "bcryptjs"

const COOKIE_NAME = "jwt";

const signToken = (id) => {
  return jwt.sign({ id }, process.env.SECRET, {
    expiresIn: process.env.EXPIRES_IN,
  });
};

const getCookieOptions = () => ({
  httpOnly: true,
  // secure: process.env.NODE_ENV === "production",
  // sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
  secure:true,
  sameSite:"none",
  maxAge:
    Number(process.env.JWT_COOKIE_EXPIRES_IN || 90) *
    24 *
    60 *
    60 *
    1000,
});

const setAuthCookie = (res, token) => {
  res.cookie(COOKIE_NAME, token, getCookieOptions());
};

const getCookieToken = (req) => {
  const cookieHeader = req.headers.cookie;

  if (!cookieHeader) {
    return null;
  }

  const cookies = cookieHeader.split(";").reduce((acc, currentCookie) => {
    const [key, ...value] = currentCookie.trim().split("=");

    if (key) {
      acc[key] = decodeURIComponent(value.join("="));
    }

    return acc;
  }, {});

  return cookies[COOKIE_NAME] || null;
};

const sendAuthResponse = (res, statusCode, user) => {
  const authToken = signToken(user._id);

  setAuthCookie(res, authToken);

  return res.status(statusCode).json({
    status: "success",
    token: authToken,
    result: {
      user,
    },
  });
};

const normalizeToken = (token) => {
  
  if (!token || typeof token !== "string") {
    return null;
  }

  const trimmedToken = token.trim().replace(/^"|"$/g, "");

  if (
    !trimmedToken ||
    trimmedToken === "null" ||
    trimmedToken === "undefined"
  ) {
    return null;
  }

  return trimmedToken;
};

export const signup = async (req, res) => {
  try {
    const { name, username, email, password } = req.body;

    // ✅ 1. Validate request body
    if (!name || !username || !email || !password) {
      return res.status(400).json({
        status: "failed",
        message: "All fields are required",
      });
    }

    // ✅ 2. Check existing user (email or username)
    const existingUser = await UserModel.findOne({
      $or: [{ email }, { username }],
    });

    if (existingUser) {
      return res.status(400).json({
        status: "failed",
        message:
          existingUser.email === email
            ? "Email already exists"
            : "Username already taken",
      });
    }

    // ✅ 3. Create user (NO image upload here)
    const newUser = await UserModel.create({
      name,
      username,
      email,
      password,
    });

    return sendAuthResponse(res, 201, newUser);
  } catch (error) {
    return res.status(500).json({
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

    user.password = undefined;
    return sendAuthResponse(res, 200, user);
  } catch (error) {
    res.status(400).json({
      status: "error",
      message: error.message,
    });
  }
};


export const protect  = async(req,res,next) => {
   try {
    const token = normalizeToken(getCookieToken(req));

    if(!token){
      return res
          .status(401)
          .json({
            status: "failed",
            message: "please check, user is not logged in",
          });
    }

    const decoded = await promisify(jwt.verify)(token,process.env.SECRET)
    const currentUser = await UserModel.findById(decoded.id)

    if(!currentUser){
      return res
      .status(401)
      .json({
        status: "failed",
        message: "User doesn't exist",
      });
    }

    req.user = currentUser
    next()
   } catch (error) {
    return res.status(401).json({
      status: "failed",
      message:
        error.name === "JsonWebTokenError" || error.name === "TokenExpiredError"
          ? "Invalid or expired token"
          : error.message,
    });
   }
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

    currentUser.password = undefined;
    return sendAuthResponse(res, 201, currentUser);

    // console.log('new',currentUser.password)
  } catch (error) {
    res.status(500).json({
      status: "error",
      message: error.message,
    });
  }
}

export const logout = async (req, res) => {
  res.clearCookie(COOKIE_NAME, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
  });

  return res.status(200).json({
    status: "success",
    message: "Logged out successfully",
  });
}
