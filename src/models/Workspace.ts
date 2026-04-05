import mongoose, { Schema, Document, Model } from "mongoose"

export interface IWorkspaceMember {
  userId: mongoose.Types.ObjectId | string
  role: "owner" | "admin" | "member"
}

export interface IWorkspace extends Document {
  name: string
  timezone: string
  ownerId: mongoose.Types.ObjectId | string
  members: IWorkspaceMember[]
  createdAt: Date
  updatedAt: Date
}

const WorkspaceSchema = new Schema<IWorkspace>(
  {
    name: { type: String, required: true, trim: true },
    timezone: { type: String, default: "UTC" },
    ownerId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    members: [
      {
        userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
        role: { type: String, enum: ["owner", "admin", "member"], default: "member" },
      },
    ],
  },
  { timestamps: true }
)

const Workspace: Model<IWorkspace> =
  mongoose.models.Workspace ?? mongoose.model<IWorkspace>("Workspace", WorkspaceSchema)

export default Workspace
