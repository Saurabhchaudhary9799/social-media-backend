import mongoose, { Schema } from "mongoose";

const followerSchema = new Schema({
  follower: { type: Schema.Types.ObjectId, ref: "User", required: true },
  user: { type: Schema.Types.ObjectId, ref: "User", required: true },
});

const followingSchema = new Schema({
  following: { type: Schema.Types.ObjectId, ref: "User", required: true },
  user: { type: Schema.Types.ObjectId, ref: "User", required: true },
});

const saveSchema = new Schema({
    user:{type: Schema.Types.ObjectId, ref: "User", required: true },
    post:{type:Schema.Types.ObjectId,ref:'Post',required:true}
})


export const saveModel = mongoose.model("Save",saveSchema)

export const FollowingModel = mongoose.model("Following", followingSchema);

export const FollowerModel = mongoose.model("Follower", followerSchema);
