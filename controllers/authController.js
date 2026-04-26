import { promisify } from "util";
import jwt from "jsonwebtoken";
import UserModel from "../models/userModel.js";
import bcrypt from "bcryptjs";
import { Resend } from "resend";
import * as crypto from "crypto";

const COOKIE_NAME = "jwt";

const resend = new Resend(`re_KSUzKDZJ_8n2z6hUypAd6a4XMhkWHjvo8`);

const signToken = (id) => {
  return jwt.sign({ id }, process.env.SECRET, {
    expiresIn: process.env.EXPIRES_IN,
  });
};

const signRefreshToken = (id) => {
  return jwt.sign({ id }, process.env.REFRESH_SECRET, {
    expiresIn: "7d",
  });
};


const sendAuthResponse = (res, statusCode, user) => {
  const accessToken = signToken(user._id);
  const refreshToken = signRefreshToken(user._id);

  return res.status(statusCode).json({
    status: "success",
    accessToken,
    refreshToken,
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

    console.log({username,password})

    if (!username || !password) {
      return res.status(400).json({
        status: "failed",
        message: "please provide complete credentials",
      });
    }

    const user = await UserModel.findOne({ username })
      .select("+password")
      .populate("posts followings followers");
    // .populate('followings')
    // .populate('followers');
console.log('user',user)
    if (!user) {
      return res.status(400).json({
        status: "failed",
        message: "please provide valid credentials",
      });
    }



    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({
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

export const protect = async (req, res, next) => {
  try {
    // const token = normalizeToken(getCookieToken(req));

    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        status: "failed",
        message: "No token provided",
      });
    }

    const token = authHeader.split(" ")[1];

    if (!token) {
      return res.status(401).json({
        status: "failed",
        message: "please check, user is not logged in",
      });
    }

    const decoded = await promisify(jwt.verify)(token, process.env.SECRET);
    const currentUser = await UserModel.findById(decoded.id);

    if (!currentUser) {
      return res.status(401).json({
        status: "failed",
        message: "User doesn't exist",
      });
    }

    req.user = currentUser;
    next();
  } catch (error) {
    return res.status(401).json({
      status: "failed",
      message:
        error.name === "JsonWebTokenError" || error.name === "TokenExpiredError"
          ? "Invalid or expired token"
          : error.message,
    });
  }
};

export const refreshToken = async (req, res) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(401).json({ message: "No refresh token" });
    }

    const decoded = jwt.verify(refreshToken, process.env.REFRESH_SECRET);

    const newAccessToken = signAccessToken(decoded.id);

    res.json({ accessToken: newAccessToken });
  } catch (err) {
    res.status(401).json({ message: "Invalid refresh token" });
  }
};

export const forgotPassword = async (req,res) => {
  try {
   
    const { email } = req.body;
    
    if (!email) {
      return res.status(400).json({
        status: "failed",
        message: "please provide email",
      });
    }

    const user = await UserModel.findOne({ email });

    // Always send generic response (security)
    if (!user) {
      return res.status(200).json({
        message: "If an account exists, a reset link has been sent.",
      });
    }
    const resetToken = crypto.randomBytes(32).toString("hex");
    user.resetPasswordToken = crypto
      .createHash("sha256")
      .update(resetToken)
      .digest("hex");
    user.resetPasswordExpires = Date.now() + 15 * 60 * 1000; // 15 minutes
    await user.save({ validateBeforeSave: false });

    const frontendUrl = process.env.NODE_ENV === "production" ? process.env.PROD_ORIGIN : process.env.DEV_ORIGIN;

    // Send email with resetToken (hashed in DB)
    const resetURL = `${frontendUrl}/reset-password?token=${resetToken}`;

    const data = await resend.emails.send({
      from: "onboarding@resend.dev",
      to: email,
      subject: "Password Reset Request",
      html: `
        <p>You requested a password reset. Click the link below to reset your password:</p>
        <a href="${resetURL}">Reset Password</a>
        <p>This link will expire in 15 minutes.</p>
        <p>If you did not request this, please ignore this email.</p>
      `,
    });

    

    return res.status(200).json({
      status: "success",
      message: "If an account exists, a reset link has been sent.",
    });
    
  } 
  catch (error) {
    res.status(500).json({
      status: "error",
      message: error.message,
    });
  }
}

export const resetPassword = async (req, res) => {
  try {
    const { token, password } = req.body;

    // Hash incoming token
    const hashedToken = crypto
      .createHash("sha256")
      .update(token)
      .digest("hex");

    const user = await UserModel.findOne({
      resetPasswordToken: hashedToken,
      resetPasswordExpires: { $gt: Date.now() },
    });

    if (!user) {
      return res.status(400).json({ message: "Invalid or expired token" });
    }

   

    // Hash new password
    // const hashedPassword = await bcrypt.hash(password, 10);

    user.password = password;

    // Remove reset fields (one-time use)
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;

    await user.save({ validateModifiedOnly: true });

    return res.status(200).json({
      message: "Password reset successful",
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Something went wrong" });
  }
};

export const updatePassword = async (req, res) => {
  try {
    const old_password = req.body.old_password;
    const new_password = req.body.new_password;
    const currentUser = await UserModel.findById({ _id: req.user._id })
      .select("+password")
      .populate("posts followings followers");
    if (!currentUser) {
      return res
        .status(404)
        .json({ status: "failed", message: "user not found" });
    }

    const isMatches = await bcrypt.compare(old_password, currentUser.password);

    if (!isMatches) {
      return res.status(404).json({
        status: "failed",
        message: "please fill correct old password",
      });
    }
    // console.log('old',currentUser.password)
    currentUser.password = new_password;
    await currentUser.save({ validateModifiedOnly: true });

    currentUser.password = undefined;
    return sendAuthResponse(res, 201, currentUser);

    // console.log('new',currentUser.password)
  } catch (error) {
    res.status(500).json({
      status: "error",
      message: error.message,
    });
  }
};

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
};
