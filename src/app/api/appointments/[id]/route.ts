import { NextRequest } from "next/server"
import { z } from "zod"
import { connectDB } from "@/lib/mongodb"
import Appointment from "@/models/Appointment"
import FamilyMember from "@/models/FamilyMember"
import User from "@/models/User"
import { auth } from "@/auth"
import { requireWorkspaceAccess } from "@/lib/workspace-utils"
import { invalidateKeys, invalidatePattern, CacheKeys } from "@/lib/cache"

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
  interval: z.number().default(1),
  endDate: z.string().datetime().optional(),
  occurrences: z.number().optional(),
  nextDate: z.string().datetime().optional(),
});

const UpdateAppointmentSchema = z.object({
  title: z.string().min(1).trim().optional(),
  category: z.enum(CATEGORIES).optional(),
  subcategory: z.string().trim().optional(),
  memberId: z.string().optional(),
  memberIds: z.array(z.string()).min(1).optional(),
  date: z.string().datetime().optional(),
  time: z.string().optional(),
  startsAt: z.string().datetime().optional(),
  endsAt: z.string().datetime().optional(),
  location: z.string().trim().optional(),
  notes: z.string().trim().optional(),
  isRecurring: z.boolean().optional(),
  recurrence: RecurrenceSchema.optional(),
  reminderRules: z.array(z.number()).optional(),
  status: z.enum(["upcoming", "completed", "cancelled", "rescheduled"]).optional(),
  reminderSent: z.boolean().optional(),
  deletedAt: z.string().datetime().optional(),
})

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  try {
    const workspaceId = _request.headers.get("x-workspace-id") || new URL(_request.url).searchParams.get("workspaceId");
    if (!workspaceId) return Response.json({ error: "Missing workspace context" }, { status: 400 });

    const { workspace } = await requireWorkspaceAccess(workspaceId);

    const appointment = await Appointment.findOne({ _id: id, workspaceId: workspace._id })
      .populate("memberIds", "name role avatar color")
      .populate("memberId", "name role avatar")

    if (!appointment) return Response.json({ error: "Appointment not found" }, { status: 404 })

    return Response.json({ appointment }, { status: 200 })
  } catch (error) {
    console.error(`[Appointments GET id=${id}] Error:`, error)
    return Response.json({ error: "Internal server error", details: String(error) }, { status: 500 })
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  try {
    const workspaceId = request.headers.get("x-workspace-id");
    if (!workspaceId) return Response.json({ error: "Missing workspace context" }, { status: 400 });

    const { userId, workspace } = await requireWorkspaceAccess(workspaceId);

    const body = await request.json()
    
    if (!body.memberIds && body.memberId) {
      body.memberIds = [body.memberId];
    }
    if (!body.startsAt && body.date) {
      body.startsAt = body.date;
    }

    const parsed = UpdateAppointmentSchema.safeParse(body)
    if (!parsed.success) return Response.json({ error: "Validation failed", issues: parsed.error.issues }, { status: 400 })

    const appointment = await Appointment.findOneAndUpdate(
      { _id: id, workspaceId: workspace._id },
      { ...parsed.data, updatedBy: userId },
      { new: true, runValidators: true }
    ).populate("memberIds", "name role avatar color").populate("memberId", "name role avatar")

    if (!appointment) return Response.json({ error: "Appointment not found" }, { status: 404 })

    await Promise.all([
      invalidatePattern(CacheKeys.appointmentsPattern(workspaceId)),
      invalidateKeys(CacheKeys.dashboardOverview(workspaceId)),
    ])

    return Response.json({ appointment }, { status: 200 })
  } catch (error) {
    console.error(`[Appointments PUT id=${id}] Error:`, error)
    return Response.json({ error: "Internal server error", details: String(error) }, { status: 500 })
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  try {
    const workspaceId = _request.headers.get("x-workspace-id") || new URL(_request.url).searchParams.get("workspaceId");
    if (!workspaceId) return Response.json({ error: "Missing workspace context" }, { status: 400 });

    const { workspace } = await requireWorkspaceAccess(workspaceId);

    const appointment = await Appointment.findOneAndDelete({ _id: id, workspaceId: workspace._id })
    if (!appointment) return Response.json({ error: "Appointment not found" }, { status: 404 })

    await Promise.all([
      invalidatePattern(CacheKeys.appointmentsPattern(workspaceId)),
      invalidateKeys(CacheKeys.dashboardOverview(workspaceId)),
    ])

    return Response.json({ message: "Appointment deleted" }, { status: 200 })
  } catch (error) {
    console.error(`[Appointments DELETE id=${id}] Error:`, error)
    return Response.json({ error: "Internal server error", details: String(error) }, { status: 500 })
  }
}
