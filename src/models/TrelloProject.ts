import mongoose, { Schema, Document, Model } from "mongoose"

export interface ITrelloProject extends Document {
  workspaceId: mongoose.Types.ObjectId | string
  name: string
  description?: string
  color?: string
  createdBy: mongoose.Types.ObjectId | string
  archivedAt?: Date
  createdAt: Date
  updatedAt: Date
}

const TrelloProjectSchema = new Schema<ITrelloProject>(
  {
    workspaceId: { type: Schema.Types.ObjectId, ref: "Workspace", required: true, index: true },
    name: { type: String, required: true, trim: true },
    description: { type: String, trim: true },
    color: { type: String, default: "#6366f1" },
    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
    archivedAt: { type: Date },
  },
  { timestamps: true }
)

TrelloProjectSchema.index({ workspaceId: 1, archivedAt: 1 })

const TrelloProject: Model<ITrelloProject> =
  mongoose.models.TrelloProject ??
  mongoose.model<ITrelloProject>("TrelloProject", TrelloProjectSchema)

export default TrelloProject
