import { NextRequest } from "next/server"
import { z } from "zod"
import { connectDB } from "@/lib/mongodb"
import Appointment from "@/models/Appointment"

const CATEGORIES = [
  "health_wellness",
  "education_development",
  "activities_enrichment",
  "life_logistics",
  "family_relationship",
  "administrative",
  "mom_personal_care",
] as const

const RecurrenceSchema = z.object({
  frequency: z.enum(["weekly", "monthly", "yearly"]),
  nextDate: z.string().datetime().optional(),
})

const CreateAppointmentSchema = z.object({
  userId: z.string().min(1),
  title: z.string().min(1).trim(),
  category: z.enum(CATEGORIES),
  subcategory: z.string().trim().optional(),
  memberId: z.string().min(1),
  date: z.string().datetime(),
  time: z.string().optional(),
  location: z.string().trim().optional(),
  notes: z.string().trim().optional(),
  isRecurring: z.boolean().default(false),
  recurrence: RecurrenceSchema.optional(),
})

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get("userId")

    if (!userId) {
      return Response.json({ error: "userId is required" }, { status: 400 })
    }

    // Build filter from query params
    const filter: Record<string, unknown> = { userId }

    const category = searchParams.get("category")
    if (category) filter.category = category

    const memberId = searchParams.get("memberId")
    if (memberId) filter.memberId = memberId

    const status = searchParams.get("status")
    if (status) filter.status = status

    const startDate = searchParams.get("startDate")
    const endDate = searchParams.get("endDate")
    if (startDate || endDate) {
      filter.date = {
        ...(startDate ? { $gte: new Date(startDate) } : {}),
        ...(endDate ? { $lte: new Date(endDate) } : {}),
      }
    }

    await connectDB()

    const appointments = await Appointment.find(filter)
      .populate("memberId", "name role avatar")
      .sort({ date: 1 })

    return Response.json({ appointments }, { status: 200 })
  } catch {
    return Response.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const parsed = CreateAppointmentSchema.safeParse(body)

    if (!parsed.success) {
      return Response.json(
        { error: "Validation failed", issues: parsed.error.issues },
        { status: 400 }
      )
    }

    await connectDB()

    const appointment = await Appointment.create(parsed.data)
    await appointment.populate("memberId", "name role avatar")

    return Response.json({ appointment }, { status: 201 })
  } catch {
    return Response.json({ error: "Internal server error" }, { status: 500 })
  }
}
