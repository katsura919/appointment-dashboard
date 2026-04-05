import { NextRequest } from "next/server"
import { z } from "zod"
import { connectDB } from "@/lib/mongodb"
import UserProfile from "@/models/UserProfile"
import User from "@/models/User"
import { getServerUserId } from "@/lib/server-auth"

const UpdateProfileSchema = z.object({
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

async function requireAdmin(): Promise<{ userId: string } | Response> {
  const userId = await getServerUserId()
  if (!userId) return Response.json({ error: "Unauthorized" }, { status: 401 })

  await connectDB()
  const user = await User.findById(userId).select("role")
  if (!user || user.role !== "admin") {
    return Response.json({ error: "Forbidden" }, { status: 403 })
  }

  return { userId }
}

// GET /api/user-profile/[id] — get any user's profile (admin only)
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  try {
    const result = await requireAdmin()
    if (result instanceof Response) return result

    const profile = await UserProfile.findOne({ userId: id })
    if (!profile) return Response.json({ error: "Profile not found" }, { status: 404 })

    return Response.json({ profile }, { status: 200 })
  } catch (error) {
    console.error(`[UserProfile GET id=${id}] Error:`, error)
    return Response.json({ error: "Internal server error" }, { status: 500 })
  }
}

// PUT /api/user-profile/[id] — update any user's profile (admin only)
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  try {
    const result = await requireAdmin()
    if (result instanceof Response) return result

    const body = await request.json()
    const parsed = UpdateProfileSchema.safeParse(body)

    if (!parsed.success) {
      return Response.json(
        { error: "Validation failed", issues: parsed.error.issues },
        { status: 400 }
      )
    }

    const profile = await UserProfile.findOneAndUpdate(
      { userId: id },
      { $set: parsed.data },
      { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true }
    )

    return Response.json({ profile }, { status: 200 })
  } catch (error) {
    console.error(`[UserProfile PUT id=${id}] Error:`, error)
    return Response.json({ error: "Internal server error" }, { status: 500 })
  }
}

// DELETE /api/user-profile/[id] — delete any user's profile (admin only)
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  try {
    const result = await requireAdmin()
    if (result instanceof Response) return result

    const profile = await UserProfile.findOneAndDelete({ userId: id })
    if (!profile) return Response.json({ error: "Profile not found" }, { status: 404 })

    return Response.json({ message: "Profile deleted" }, { status: 200 })
  } catch (error) {
    console.error(`[UserProfile DELETE id=${id}] Error:`, error)
    return Response.json({ error: "Internal server error" }, { status: 500 })
  }
}
