import mongoose, { Schema, Document, Model } from "mongoose"

export interface IWellBeingLog extends Document {
  workspaceId: mongoose.Types.ObjectId | string
  date: Date
  metrics: {
    moodScore?: number       // 1-5
    stressLevel?: number     // 1-5
    energyLevel?: number     // 1-5
    sleepHours?: number      
    sleepQuality?: number    // 1-5
    activityLevel?: number   // 1-5
    hydrationScore?: number  // 1-5
  }
  tags?: string[]
  notes?: string
  createdAt: Date
  updatedAt: Date
}

const WellBeingLogSchema = new Schema<IWellBeingLog>(
  {
    workspaceId: { type: Schema.Types.ObjectId, ref: "Workspace", required: true, index: true },
    date: { type: Date, required: true },
    metrics: {
      moodScore: { type: Number, min: 1, max: 5 },
      stressLevel: { type: Number, min: 1, max: 5 },
      energyLevel: { type: Number, min: 1, max: 5 },
      sleepHours: { type: Number, min: 0, max: 24 },
      sleepQuality: { type: Number, min: 1, max: 5 },
      activityLevel: { type: Number, min: 1, max: 5 },
      hydrationScore: { type: Number, min: 1, max: 5 },
    },
    tags: [{ type: String, trim: true }],
    notes: { type: String, trim: true },
  },
  { timestamps: true }
)

// Compound index for querying a user's logs over time smoothly
WellBeingLogSchema.index({ workspaceId: 1, date: -1 })

const WellBeingLog: Model<IWellBeingLog> =
  mongoose.models.WellBeingLog ??
  mongoose.model<IWellBeingLog>("WellBeingLog", WellBeingLogSchema)

export default WellBeingLog
