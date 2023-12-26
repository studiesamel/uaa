import mongoose from "mongoose";

export const UserSchema = new mongoose.Schema({
    username : {
        type: String,
        required : [true, "Please provide unique Username"],
        unique: [true, "Username Exist"]
    },
    password: {
        type: String,
        required: [true, "Please provide a password"],
        unique : false,
    },
    email: {
        type: String,
        required : [true, "Please provide a unique email"],
        unique: true,
    },
    trustedEmail: {
        type: String,
        required: true,
        lowercase: true,
       
        trim: true,
      },
      resetToken:{
        type: String,
      },
      resetTokenExpiration:{
        type: Date,
      },
});

export default mongoose.model.Users || mongoose.model('User', UserSchema);