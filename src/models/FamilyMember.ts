import mongoose, { Schema, Document, Model } from "mongoose"

export interface IFamilyMember extends Document {
  workspaceId: mongoose.Types.ObjectId | string
  name: string
  role: "mom" | "dad" | "child" | "other"
  color?: string
  dateOfBirth?: Date
  contactNumber?: string
  email?: string
  avatar?: string
  deletedAt?: Date
  createdBy?: mongoose.Types.ObjectId
  updatedBy?: mongoose.Types.ObjectId
  createdAt: Date
  updatedAt: Date
}

const FamilyMemberSchema = new Schema<IFamilyMember>(
  {
    workspaceId: { type: Schema.Types.ObjectId, ref: "Workspace", required: true, index: true },
    name: { type: String, required: true, trim: true },
    role: { type: String, enum: ["mom", "dad", "child", "other"], required: true },
    color: { type: String, trim: true },
    dateOfBirth: { type: Date },
    contactNumber: { type: String, trim: true },
    email: { type: String, trim: true },
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
