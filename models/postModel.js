import mongoose, { Schema } from "mongoose";

const postSchema = new Schema({
  bio: {
    type: String,
    // maxLength: [100, "bio must not have more than 100 words"],
  },
  image: {
    type:String,
    required:true
  },
  tags:[String],
  user: { type: Schema.Types.ObjectId, ref: "User", required: true },
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

postSchema.virtual('comments',{
  ref:'Comment',
  localField:"_id",
  foreignField:"post"
})



postSchema.virtual('likes',{
  ref:'Like',
  localField:"_id",
  foreignField:"post"
})

const PostModel = mongoose.model("Post", postSchema);

export default PostModel;
