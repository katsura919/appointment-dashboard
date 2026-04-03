import type { AppointmentCategory } from "@/lib/categories"

export type AppointmentStatus = "upcoming" | "completed" | "cancelled" | "rescheduled"
export type MemberRole = "mom" | "dad" | "child" | "other"
export type RecurrenceFrequency = "weekly" | "monthly" | "yearly"

export interface FamilyMemberResponse {
  _id: string
  userId: string
  name: string
  role: MemberRole
  color?: string
  dateOfBirth?: string
  contactNumber?: string
  email?: string
  avatar?: string
  createdAt: string
}

export interface AppointmentResponse {
  _id: string
  userId: string
  title: string
  category: AppointmentCategory
  subcategory?: string
  memberId?: {
    _id: string
    name: string
    role: MemberRole
    avatar?: string
  }
  memberIds: FamilyMemberResponse[]
  date?: string
  time?: string
  startsAt: string
  endsAt?: string
  location?: string
  notes?: string
  isRecurring: boolean
  recurrence?: {
    frequency: RecurrenceFrequency
    interval?: number
    occurrences?: number
    endDate?: string
    nextDate?: string
  }
  status: AppointmentStatus
  reminderRules?: number[]
  reminderSent: boolean
  createdAt: string
}
