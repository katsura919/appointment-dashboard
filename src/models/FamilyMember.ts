import mongoose, { Schema, Document, Model } from "mongoose"

export interface IFamilyMember extends Document {
  userId: mongoose.Types.ObjectId
  name: string
  role: "mom" | "dad" | "child" | "other"
  color?: string
  dateOfBirth?: Date
  avatar?: string
  deletedAt?: Date
  createdBy?: mongoose.Types.ObjectId
  updatedBy?: mongoose.Types.ObjectId
  createdAt: Date
  updatedAt: Date
}

const FamilyMemberSchema = new Schema<IFamilyMember>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    name: { type: String, required: true, trim: true },
    role: { type: String, enum: ["mom", "dad", "child", "other"], required: true },
    color: { type: String, trim: true },
    dateOfBirth: { type: Date },
    avatar: { type: String },
    deletedAt: { type: Date },
    createdBy: { type: Schema.Types.ObjectId, ref: "User" },
    updatedBy: { type: Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
)

const FamilyMember: Model<IFamilyMember> =
  mongoose.models.FamilyMember ??
  mongoose.model<IFamilyMember>("FamilyMember", FamilyMemberSchema)

export default FamilyMember
