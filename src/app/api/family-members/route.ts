import { NextRequest } from "next/server"
import { z } from "zod"
import { connectDB } from "@/lib/mongodb"
import FamilyMember from "@/models/FamilyMember"

const CreateFamilyMemberSchema = z.object({
  userId: z.string().min(1),
  name: z.string().min(1).trim(),
  role: z.enum(["mom", "dad", "child", "other"]),
  dateOfBirth: z.string().datetime().optional(),
  avatar: z.string().optional(),
})

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get("userId")

    if (!userId) {
      return Response.json({ error: "userId is required" }, { status: 400 })
    }

    await connectDB()

    const members = await FamilyMember.find({ userId }).sort({ createdAt: 1 })

    return Response.json({ members }, { status: 200 })
  } catch {
    return Response.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const parsed = CreateFamilyMemberSchema.safeParse(body)

    if (!parsed.success) {
      return Response.json(
        { error: "Validation failed", issues: parsed.error.issues },
        { status: 400 }
      )
    }

    await connectDB()

    const member = await FamilyMember.create(parsed.data)

    return Response.json({ member }, { status: 201 })
  } catch {
    return Response.json({ error: "Internal server error" }, { status: 500 })
  }
}
