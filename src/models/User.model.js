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
    resetPasswordOtp: {
      type: String,
    },
    resetPasswordExpires: {
      type: Date,
    },
    // Magic Link Auth
    magicLinkToken: { type: String },
    magicLinkExpires: { type: Date },
    magicLoginId: { type: String }, // Public ID for polling
    magicLinkStatus: { type: String, enum: ["pending", "verified"], default: "pending" },
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
        panNumber: {
          type: String,
          required: true,
          match: [/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/, 'Please enter a valid PAN number']
        },
        dpId: { type: String }, // DP Client ID (Demat Account Number)
        name: { type: String, default: "", required: false },
        dob: { type: Date },
        status: { type: String, enum: ["PENDING", "VERIFIED", "REJECTED"], default: "PENDING" },
        documentUrl: { type: String }, // Link to uploaded image/pdf
      }
    ],
    watchlist: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Mainboard' }],
    emailPreferences: {
      newIpo: { type: Boolean, default: false },
      gmpUpdate: { type: Boolean, default: false }
    }
  },
  { timestamps: true }
);

const User = mongoose.model("User", userSchema);

export default User;
