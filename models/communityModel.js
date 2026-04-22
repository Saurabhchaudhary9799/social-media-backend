import mongoose , {Schema} from "mongoose";
import { userSchema } from "./userModel.js";

const communitySchema = new Schema ({
    members:[  {
      memberId:{
        type:String,
      },
      name: {
        type: String,
        required: [true, "name must be required"],
        trim: true,
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
      profile_image: {
        type: String,
        required: true,
      },
      cover_image: {
        type: String,
        required: true,
      },
      location: {
        x: {
          type: Number,
          required: false, // Not required at the time of creation
  
          default: null,
        },
        y: {
          type: Number,
          required: false, // Not required at the time of creation
  
          default: null,
        },
      },
    }],
    chats:[
      {
        message:String,
        sender:String,
        createdAt:{
          type:Date,
          default:Date.now
        },
        profile_image:String,
        username:String,
      }
    ]
})

const Community = mongoose.model("Community", communitySchema);

export default Community;