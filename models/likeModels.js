import mongoose ,{Schema} from "mongoose"

const likeSchema = new Schema({
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    post: { type: Schema.Types.ObjectId, ref: 'Post' , required: true},
  });

  const LikeModel = mongoose.model("Like", likeSchema);

  export default LikeModel;