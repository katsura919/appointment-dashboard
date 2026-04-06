import mongoose, { Schema, Document, Model } from "mongoose"

export interface ITrelloPipeline extends Document {
  projectId: mongoose.Types.ObjectId | string
  workspaceId: mongoose.Types.ObjectId | string
  name: string
  position: number
  color?: string
  wipLimit?: number
  archivedAt?: Date
  createdAt: Date
  updatedAt: Date
}

const TrelloPipelineSchema = new Schema<ITrelloPipeline>(
  {
    projectId: { type: Schema.Types.ObjectId, ref: "TrelloProject", required: true, index: true },
    workspaceId: { type: Schema.Types.ObjectId, ref: "Workspace", required: true, index: true },
    name: { type: String, required: true, trim: true },
    position: { type: Number, required: true, default: 0 },
    color: { type: String },
    wipLimit: { type: Number, min: 1 },
    archivedAt: { type: Date },
  },
  { timestamps: true }
)

TrelloPipelineSchema.index({ projectId: 1, position: 1 })

const TrelloPipeline: Model<ITrelloPipeline> =
  mongoose.models.TrelloPipeline ??
  mongoose.model<ITrelloPipeline>("TrelloPipeline", TrelloPipelineSchema)

export default TrelloPipeline
