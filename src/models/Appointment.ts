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
  userId: mongoose.Types.ObjectId
  title: string
  category: AppointmentCategory
  subcategory?: string
  memberId: mongoose.Types.ObjectId
  date: Date
  time?: string
  location?: string
  notes?: string
  isRecurring: boolean
  recurrence?: {
    frequency: RecurrenceFrequency
    nextDate?: Date
  }
  status: AppointmentStatus
  reminderSent: boolean
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
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    title: { type: String, required: true, trim: true },
    category: { type: String, enum: CATEGORIES, required: true },
    subcategory: { type: String, trim: true },
    memberId: { type: Schema.Types.ObjectId, ref: "FamilyMember", required: true },
    date: { type: Date, required: true },
    time: { type: String },
    location: { type: String, trim: true },
    notes: { type: String, trim: true },
    isRecurring: { type: Boolean, default: false },
    recurrence: {
      frequency: { type: String, enum: ["weekly", "monthly", "yearly"] },
      nextDate: { type: Date },
    },
    status: {
      type: String,
      enum: ["upcoming", "completed", "cancelled", "rescheduled"],
      default: "upcoming",
    },
    reminderSent: { type: Boolean, default: false },
  },
  { timestamps: true }
)

// Compound index for efficient dashboard queries
AppointmentSchema.index({ userId: 1, date: 1 })
AppointmentSchema.index({ userId: 1, category: 1 })
AppointmentSchema.index({ userId: 1, memberId: 1 })

const Appointment: Model<IAppointment> =
  mongoose.models.Appointment ??
  mongoose.model<IAppointment>("Appointment", AppointmentSchema)

export default Appointment
