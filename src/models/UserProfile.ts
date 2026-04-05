import mongoose, { Schema, Document, Model } from "mongoose"

export interface IEmergencyContact {
  name: string
  phone: string
  relationship?: string
}

export interface IUserProfile extends Document {
  userId: mongoose.Types.ObjectId
  profilePic?: string
  phone?: string
  dateOfBirth?: Date
  gender?: "male" | "female" | "non-binary" | "prefer-not-to-say"
  bio?: string
  address?: string
  jobTitle?: string
  department?: string
  emergencyContact?: IEmergencyContact
  socialLinks?: {
    linkedin?: string
    twitter?: string
    website?: string
  }
  createdAt: Date
  updatedAt: Date
}

const EmergencyContactSchema = new Schema<IEmergencyContact>(
  {
    name: { type: String, required: true, trim: true },
    phone: { type: String, required: true, trim: true },
    relationship: { type: String, trim: true },
  },
  { _id: false }
)

const UserProfileSchema = new Schema<IUserProfile>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, unique: true, index: true },
    profilePic: { type: String },
    phone: { type: String, trim: true },
    dateOfBirth: { type: Date },
    gender: { type: String, enum: ["male", "female", "non-binary", "prefer-not-to-say"] },
    bio: { type: String, trim: true, maxlength: 500 },
    address: { type: String, trim: true },
    jobTitle: { type: String, trim: true },
    department: { type: String, trim: true },
    emergencyContact: { type: EmergencyContactSchema },
    socialLinks: {
      linkedin: { type: String, trim: true },
      twitter: { type: String, trim: true },
      website: { type: String, trim: true },
    },
  },
  { timestamps: true }
)

const UserProfile: Model<IUserProfile> =
  mongoose.models.UserProfile ?? mongoose.model<IUserProfile>("UserProfile", UserProfileSchema)

export default UserProfile
