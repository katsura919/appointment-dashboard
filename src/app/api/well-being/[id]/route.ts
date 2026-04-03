import { NextRequest } from "next/server"
import { z } from "zod"
import { connectDB } from "@/lib/mongodb"
import WellBeingLog from "@/models/WellBeingLog"
import { auth } from "@/auth"

const MetricsSchema = z.object({
  moodScore: z.number().min(1).max(5).optional(),
  stressLevel: z.number().min(1).max(5).optional(),
  energyLevel: z.number().min(1).max(5).optional(),
  sleepHours: z.number().min(0).max(24).optional(),
  sleepQuality: z.number().min(1).max(5).optional(),
  activityLevel: z.number().min(1).max(5).optional(),
  hydrationScore: z.number().min(1).max(5).optional(),
})

const UpdateWellBeingSchema = z.object({
  date: z.string().datetime().optional(),
  metrics: MetricsSchema.optional(),
  tags: z.array(z.string()).optional(),
  notes: z.string().trim().optional(),
})

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return Response.json({ error: "Unauthorized" }, { status: 401 })
    }
    const userId = session.user.id
    const { id } = await params

    if (!id) {
        return Response.json({ error: "Missing ID" }, { status: 400 })
    }

    await connectDB()

    const log = await WellBeingLog.findOne({ _id: id, userId })

    if (!log) {
      return Response.json({ error: "Log not found" }, { status: 404 })
    }

    return Response.json({ log }, { status: 200 })
  } catch (error) {
    console.error("[WellBeing [id] GET] Error:", error)
    return Response.json(
      { error: "Internal server error", details: String(error) },
      { status: 500 }
    )
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return Response.json({ error: "Unauthorized" }, { status: 401 })
    }
    const userId = session.user.id
    const { id } = await params

    if (!id) {
        return Response.json({ error: "Missing ID" }, { status: 400 })
    }

    const body = await request.json()
    const parsed = UpdateWellBeingSchema.safeParse(body)

    if (!parsed.success) {
      return Response.json(
        { error: "Validation failed", issues: parsed.error.issues },
        { status: 400 }
      )
    }

    await connectDB()

    const log = await WellBeingLog.findOneAndUpdate(
      { _id: id, userId },
      { $set: parsed.data },
      { new: true, runValidators: true }
    )

    if (!log) {
      return Response.json({ error: "Log not found" }, { status: 404 })
    }

    return Response.json({ log }, { status: 200 })
  } catch (error) {
    console.error("[WellBeing [id] PUT] Error:", error)
    return Response.json(
      { error: "Internal server error", details: String(error) },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return Response.json({ error: "Unauthorized" }, { status: 401 })
    }
    const userId = session.user.id
    const { id } = await params

    if (!id) {
        return Response.json({ error: "Missing ID" }, { status: 400 })
    }

    await connectDB()

    const result = await WellBeingLog.deleteOne({ _id: id, userId })

    if (result.deletedCount === 0) {
      return Response.json({ error: "Log not found" }, { status: 404 })
    }

    return Response.json({ message: "Log deleted successfully" }, { status: 200 })
  } catch (error) {
    console.error("[WellBeing [id] DELETE] Error:", error)
    return Response.json(
      { error: "Internal server error", details: String(error) },
      { status: 500 }
    )
  }
}
