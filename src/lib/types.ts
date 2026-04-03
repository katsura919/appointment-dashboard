import type { AppointmentCategory } from "@/lib/categories"

export type AppointmentStatus = "upcoming" | "completed" | "cancelled" | "rescheduled"
export type MemberRole = "mom" | "dad" | "child" | "other"
export type RecurrenceFrequency = "weekly" | "monthly" | "yearly"

export interface FamilyMemberResponse {
  _id: string
  userId: string
  name: string
  role: MemberRole
  dateOfBirth?: string
  avatar?: string
  createdAt: string
}

export interface AppointmentResponse {
  _id: string
  userId: string
  title: string
  category: AppointmentCategory
  subcategory?: string
  memberId: {
    _id: string
    name: string
    role: MemberRole
    avatar?: string
  }
  date: string
  time?: string
  location?: string
  notes?: string
  isRecurring: boolean
  recurrence?: {
    frequency: RecurrenceFrequency
    nextDate?: string
  }
  status: AppointmentStatus
  reminderSent: boolean
  createdAt: string
}
