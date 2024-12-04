import mongoose , {Schema} from "mongoose";


const gameSchema = new Schema({
   name:{
    type:String,
    required:[true,'Game Title should be required'],
    unique:[true,'Game title should be unique'],
   },
   win_matches:[
    {
      team1:{
        type:String,
        required:true,
      },
      team2:{
        type:String,
        required:true
      },
      winner:{
        type:String,
      }
    }],
    draw_matches:[
      {
        team1:{
          type:String,
          required:true,
        },
        team2:{
          type:String,
          required:true
        }
      }
   ]
})