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

const CreateWellBeingSchema = z.object({
  date: z.string().datetime(),
  metrics: MetricsSchema.optional(),
  tags: z.array(z.string()).optional(),
  notes: z.string().trim().optional(),
})

export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return Response.json({ error: "Unauthorized" }, { status: 401 })
    }
    const userId = session.user.id

    const { searchParams } = new URL(request.url)
    const startDate = searchParams.get("startDate")
    const endDate = searchParams.get("endDate")

    const filter: Record<string, any> = { userId }

    if (startDate || endDate) {
      filter.date = {}
      if (startDate) {
        // Ensure accurate filtering whether it's ISO date or full datetime string
        filter.date.$gte = new Date(startDate) 
      }
      if (endDate) {
        filter.date.$lte = new Date(endDate)
      }
    }

    await connectDB()

    const logs = await WellBeingLog.find(filter).sort({ date: -1 })

    return Response.json({ logs }, { status: 200 })
  } catch (error) {
    console.error("[WellBeing GET] Error fetching logs:", error)
    return Response.json(
      { error: "Internal server error", details: String(error) },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return Response.json({ error: "Unauthorized" }, { status: 401 })
    }
    const userId = session.user.id

    const body = await request.json()
    const parsed = CreateWellBeingSchema.safeParse(body)

    if (!parsed.success) {
      return Response.json(
        { error: "Validation failed", issues: parsed.error.issues },
        { status: 400 }
      )
    }

    await connectDB()

    // Optionally check if a log already exists for this exact date to prevent duplicates
    // But keeping it simple for now as we didn't firmly lock single-log per day in the model level yet.

    const log = await WellBeingLog.create({
      ...parsed.data,
      userId,
    })

    return Response.json({ log }, { status: 201 })
  } catch (error) {
    console.error("[WellBeing POST] Error:", error)
    return Response.json(
      { error: "Internal server error", details: String(error) },
      { status: 500 }
    )
  }
}
