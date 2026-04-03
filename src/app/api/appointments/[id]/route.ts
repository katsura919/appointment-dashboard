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

const UpdateAppointmentSchema = z.object({
  title: z.string().min(1).trim().optional(),
  category: z.enum(CATEGORIES).optional(),
  subcategory: z.string().trim().optional(),
  memberId: z.string().optional(),
  date: z.string().datetime().optional(),
  time: z.string().optional(),
  location: z.string().trim().optional(),
  notes: z.string().trim().optional(),
  isRecurring: z.boolean().optional(),
  recurrence: z
    .object({
      frequency: z.enum(["weekly", "monthly", "yearly"]),
      nextDate: z.string().datetime().optional(),
    })
    .optional(),
  status: z.enum(["upcoming", "completed", "cancelled", "rescheduled"]).optional(),
  reminderSent: z.boolean().optional(),
})

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    await connectDB()

    const appointment = await Appointment.findById(id).populate(
      "memberId",
      "name role avatar"
    )

    if (!appointment) {
      return Response.json({ error: "Appointment not found" }, { status: 404 })
    }

    return Response.json({ appointment }, { status: 200 })
  } catch {
    return Response.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const parsed = UpdateAppointmentSchema.safeParse(body)

    if (!parsed.success) {
      return Response.json(
        { error: "Validation failed", issues: parsed.error.issues },
        { status: 400 }
      )
    }

    await connectDB()

    const appointment = await Appointment.findByIdAndUpdate(id, parsed.data, {
      new: true,
      runValidators: true,
    }).populate("memberId", "name role avatar")

    if (!appointment) {
      return Response.json({ error: "Appointment not found" }, { status: 404 })
    }

    return Response.json({ appointment }, { status: 200 })
  } catch {
    return Response.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    await connectDB()

    const appointment = await Appointment.findByIdAndDelete(id)
    if (!appointment) {
      return Response.json({ error: "Appointment not found" }, { status: 404 })
    }

    return Response.json({ message: "Appointment deleted" }, { status: 200 })
  } catch {
    return Response.json({ error: "Internal server error" }, { status: 500 })
  }
}
