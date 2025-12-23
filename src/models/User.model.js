import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
    },
    phoneNumber: {
      type: String,
      default: "",
    },
    password: {
      type: String,
      required: true,
    },
    role: {
      type: String,
      enum: ["user", "admin", "superadmin"],
      default: "user",
    },
    isVerified: {
      type: Boolean,
      default: false,
    },
    otp: {
      type: String,
    },
    otpExpires: {
      type: Date,
    },
    profileImage: {
      type: String,
      default: "",
    },
    cloudinaryId: {
      type: String,
      default: "",
    },
    panDocuments: [
      {
        panNumber: { type: String, required: true },
        nameOnPan: { type: String, required: true },
        dob: { type: Date },
        status: { type: String, enum: ["PENDING", "VERIFIED", "REJECTED"], default: "PENDING" },
        documentUrl: { type: String }, // Link to uploaded image/pdf
      }
    ]
  },
  { timestamps: true }
);

const User = mongoose.model("User", userSchema);

export default User;
