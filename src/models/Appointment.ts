import mongoose, { Schema, Document, Model } from "mongoose"

export type AppointmentCategory =
  | "health_wellness"
  | "education_development"
  | "activities_enrichment"
  | "life_logistics"
  | "family_relationship"
  | "administrative"
  | "mom_personal_care"

export type AppointmentStatus = "upcoming" | "completed" | "cancelled" | "rescheduled"
export type RecurrenceFrequency = "weekly" | "monthly" | "yearly"

export interface IAppointment extends Document {
  workspaceId: mongoose.Types.ObjectId | string
  title: string
  category: AppointmentCategory
  subcategory?: string
  memberId?: mongoose.Types.ObjectId // legacy
  memberIds: mongoose.Types.ObjectId[]
  date?: Date // legacy
  time?: string // legacy
  startsAt: Date
  endsAt?: Date
  location?: string
  notes?: string
  isRecurring: boolean
  recurrence?: {
    frequency: RecurrenceFrequency
    interval: number
    endDate?: Date
    occurrences?: number
    nextDate?: Date
  }
  reminderRules?: number[]
  reminderDeliveries?: {
    status: "pending" | "sent" | "failed"
    scheduledFor: Date
    sentAt?: Date
  }[]
  status: AppointmentStatus
  reminderSent: boolean
  deletedAt?: Date
  createdBy?: mongoose.Types.ObjectId
  updatedBy?: mongoose.Types.ObjectId
  createdAt: Date
  updatedAt: Date
}

const CATEGORIES: AppointmentCategory[] = [
  "health_wellness",
  "education_development",
  "activities_enrichment",
  "life_logistics",
  "family_relationship",
  "administrative",
  "mom_personal_care",
]

const AppointmentSchema = new Schema<IAppointment>(
  {
    workspaceId: { type: Schema.Types.ObjectId, ref: "Workspace", required: true, index: true },
    title: { type: String, required: true, trim: true },
    category: { type: String, enum: CATEGORIES, required: true },
    subcategory: { type: String, trim: true },
    memberId: { type: Schema.Types.ObjectId, ref: "FamilyMember" }, // legacy
    memberIds: [{ type: Schema.Types.ObjectId, ref: "FamilyMember" }],
    date: { type: Date }, // legacy
    time: { type: String }, // legacy
    startsAt: { type: Date, required: true },
    endsAt: { type: Date },
    location: { type: String, trim: true },
    notes: { type: String, trim: true },
    isRecurring: { type: Boolean, default: false },
    recurrence: {
      frequency: { type: String, enum: ["weekly", "monthly", "yearly"] },
      interval: { type: Number, default: 1 },
      endDate: { type: Date },
      occurrences: { type: Number },
      nextDate: { type: Date },
    },
    reminderRules: [{ type: Number }],
    reminderDeliveries: [
      {
        status: { type: String, enum: ["pending", "sent", "failed"], default: "pending" },
        scheduledFor: { type: Date },
        sentAt: { type: Date },
      },
    ],
    status: {
      type: String,
      enum: ["upcoming", "completed", "cancelled", "rescheduled"],
      default: "upcoming",
    },
    reminderSent: { type: Boolean, default: false },
    deletedAt: { type: Date },
    createdBy: { type: Schema.Types.ObjectId, ref: "User" },
    updatedBy: { type: Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
)

// Compound index for efficient dashboard queries
AppointmentSchema.index({ workspaceId: 1, date: 1 }) // legacy
AppointmentSchema.index({ workspaceId: 1, startsAt: 1, status: 1 })
AppointmentSchema.index({ workspaceId: 1, category: 1 })
AppointmentSchema.index({ workspaceId: 1, memberId: 1 }) // legacy
AppointmentSchema.index({ workspaceId: 1, memberIds: 1 })

const Appointment: Model<IAppointment> =
  mongoose.models.Appointment ??
  mongoose.model<IAppointment>("Appointment", AppointmentSchema)

export default Appointment
