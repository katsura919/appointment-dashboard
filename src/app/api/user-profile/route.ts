import { NextRequest } from "next/server"
import { z } from "zod"
import { connectDB } from "@/lib/mongodb"
import UserProfile from "@/models/UserProfile"
import { getServerUserId } from "@/lib/server-auth"

const UpsertProfileSchema = z.object({
  profilePic: z.string().url().optional(),
  phone: z.string().trim().optional(),
  dateOfBirth: z.string().datetime().optional(),
  gender: z.enum(["male", "female", "non-binary", "prefer-not-to-say"]).optional(),
  bio: z.string().trim().max(500).optional(),
  address: z.string().trim().optional(),
  jobTitle: z.string().trim().optional(),
  department: z.string().trim().optional(),
  emergencyContact: z
    .object({
      name: z.string().trim().min(1),
      phone: z.string().trim().min(1),
      relationship: z.string().trim().optional(),
    })
    .optional(),
  socialLinks: z
    .object({
      linkedin: z.string().url().optional(),
      twitter: z.string().url().optional(),
      website: z.string().url().optional(),
    })
    .optional(),
})

// GET /api/user-profile — get the current user's profile
export async function GET() {
  try {
    const userId = await getServerUserId()
    if (!userId) return Response.json({ error: "Unauthorized" }, { status: 401 })

    await connectDB()

    const profile = await UserProfile.findOne({ userId })
    return Response.json({ profile: profile ?? null }, { status: 200 })
  } catch (error) {
    console.error("[UserProfile GET] Error:", error)
    return Response.json({ error: "Internal server error" }, { status: 500 })
  }
}

// PUT /api/user-profile — create or update the current user's profile
export async function PUT(request: NextRequest) {
  try {
    const userId = await getServerUserId()
    if (!userId) return Response.json({ error: "Unauthorized" }, { status: 401 })

    const body = await request.json()
    const parsed = UpsertProfileSchema.safeParse(body)

    if (!parsed.success) {
      return Response.json(
        { error: "Validation failed", issues: parsed.error.issues },
        { status: 400 }
      )
    }

    await connectDB()

    const profile = await UserProfile.findOneAndUpdate(
      { userId },
      { $set: parsed.data },
      { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true }
    )

    return Response.json({ profile }, { status: 200 })
  } catch (error) {
    console.error("[UserProfile PUT] Error:", error)
    return Response.json({ error: "Internal server error" }, { status: 500 })
  }
}
