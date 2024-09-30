import mongoose ,{Schema} from "mongoose";

const commentSchema = new Schema({
    message:{
        type:String,
        required:[true,'message must be required']
    },
    post:{type:Schema.Types.ObjectId,ref:'Post',required:true},
    user:{ type: Schema.Types.ObjectId, ref: "User", required: true },
    createdAt: {
        type: Date,
        default: Date.now,
      }
})



const CommentModel = mongoose.model("Comment", commentSchema);

export default CommentModel;