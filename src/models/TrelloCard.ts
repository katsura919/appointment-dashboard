import mongoose, { Schema, Document, Model } from "mongoose"

export interface ITrelloCardLabel {
  text: string
  color: string
}

export interface ITrelloCardChecklistItem {
  text: string
  checked: boolean
}

export type TrelloCardPriority = "urgent" | "high" | "medium" | "low"

export interface ITrelloCard extends Document {
  pipelineId: mongoose.Types.ObjectId | string
  projectId: mongoose.Types.ObjectId | string
  workspaceId: mongoose.Types.ObjectId | string
  title: string
  description?: string
  position: number
  assigneeIds: mongoose.Types.ObjectId[]
  labels: ITrelloCardLabel[]
  dueDate?: Date
  checklist: ITrelloCardChecklistItem[]
  priority?: TrelloCardPriority
  coverColor?: string
  archivedAt?: Date
  createdBy: mongoose.Types.ObjectId | string
  createdAt: Date
  updatedAt: Date
}

const TrelloCardSchema = new Schema<ITrelloCard>(
  {
    pipelineId: { type: Schema.Types.ObjectId, ref: "TrelloPipeline", required: true, index: true },
    projectId: { type: Schema.Types.ObjectId, ref: "TrelloProject", required: true, index: true },
    workspaceId: { type: Schema.Types.ObjectId, ref: "Workspace", required: true, index: true },
    title: { type: String, required: true, trim: true },
    description: { type: String, trim: true },
    position: { type: Number, required: true, default: 0 },
    assigneeIds: [{ type: Schema.Types.ObjectId, ref: "User" }],
    labels: [
      {
        text: { type: String, trim: true },
        color: { type: String },
      },
    ],
    dueDate: { type: Date },
    priority: { type: String, enum: ["urgent", "high", "medium", "low"] },
    coverColor: { type: String },
    checklist: [
      {
        text: { type: String, required: true, trim: true },
        checked: { type: Boolean, default: false },
      },
    ],
    archivedAt: { type: Date },
    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true }
)

TrelloCardSchema.index({ pipelineId: 1, position: 1 })
TrelloCardSchema.index({ projectId: 1 })
TrelloCardSchema.index({ assigneeIds: 1 })

const TrelloCard: Model<ITrelloCard> =
  mongoose.models.TrelloCard ??
  mongoose.model<ITrelloCard>("TrelloCard", TrelloCardSchema)

export default TrelloCard
