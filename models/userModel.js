import mongoose, { Schema } from "mongoose";
import bcrypt from "bcryptjs";
const userSchema = new Schema(
  {
    name:{
      type:String,
      required:[true,'name must be required'],
      trim:true
    },
    username: {
      type: String,
      required: [true, "Username must be required"],
      unique: [true, "Username must be unique"],
      trim: true,
      minLength: [8, "username must have minimum 8 letters"],
      maxLength: [20, "username must not have more than 20 letters"],
    },
    email: {
      type: String,
      required: [true, "email must be required"],
      unique: [true, "email must be unique"],
      match: [
        /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/,
        "Please enter a valid email address",
      ],
    },
    password: {
      type: String,
      required: [true, "password must be required"],
      minLength: [8, "paassword must contain minimum 8 letters"],
      select: false,
    },
    profile_image:{
       type:String,
       required:true,
    },
    cover_image:{
      type:String,
      required:true,
    },
    bio:{
       type:String,
       default:"",
       maxLength:[100,'bio must not have more than 100 letters']
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

userSchema.virtual('posts',{
    ref:'Post',
    localField:"_id",
    foreignField:"user"
})

userSchema.virtual('followers', {
  ref: 'Follower', // The model to use
  localField: '_id', // The field in the User schema
  foreignField: 'user', // The field in the Follower schema
});

userSchema.virtual('savedPosts', {
  ref: 'Save', // The model to use
  localField: '_id', // The field in the User schema
  foreignField: 'user', // The field in the Follower schema
});

// Virtual field for following
userSchema.virtual('followings', {
  ref: 'Following', // The model to use
  localField: '_id', // The field in the User schema
  foreignField: 'user', // The field in the Following schema
});

userSchema.pre("save", async function (next) {
  try {
    if (!this.isModified("password")) {
      return next();
    }

    this.password = await bcrypt.hash(this.password, 10);
    next();
  } catch (error) {
    next(error);
  }
});

const UserModel = mongoose.model("User", userSchema);

export default UserModel;
