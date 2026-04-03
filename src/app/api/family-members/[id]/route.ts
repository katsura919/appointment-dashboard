import { NextRequest } from "next/server"
import { z } from "zod"
import { connectDB } from "@/lib/mongodb"
import FamilyMember from "@/models/FamilyMember"

const UpdateFamilyMemberSchema = z.object({
  name: z.string().min(1).trim().optional(),
  role: z.enum(["mom", "dad", "child", "other"]).optional(),
  dateOfBirth: z.string().datetime().optional(),
  avatar: z.string().optional(),
  contactNumber: z.string().optional(),
  email: z.string().email().optional().or(z.literal("")),
})

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  try {
    await connectDB()

    const member = await FamilyMember.findById(id)
    if (!member) {
      return Response.json({ error: "Family member not found" }, { status: 404 })
    }

    return Response.json({ member }, { status: 200 })
  } catch (error) {
    console.error(`[FamilyMember GET id=${id}] Error:`, error)
    return Response.json({ error: "Internal server error", details: String(error) }, { status: 500 })
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  try {
    const body = await request.json()
    const parsed = UpdateFamilyMemberSchema.safeParse(body)

    if (!parsed.success) {
      return Response.json(
        { error: "Validation failed", issues: parsed.error.issues },
        { status: 400 }
      )
    }

    await connectDB()

    const member = await FamilyMember.findByIdAndUpdate(id, parsed.data, {
      new: true,
      runValidators: true,
    })

    if (!member) {
      return Response.json({ error: "Family member not found" }, { status: 404 })
    }

    return Response.json({ member }, { status: 200 })
  } catch (error) {
    console.error(`[FamilyMember PUT id=${id}] Error:`, error)
    return Response.json({ error: "Internal server error", details: String(error) }, { status: 500 })
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  try {
    await connectDB()

    const member = await FamilyMember.findByIdAndDelete(id)
    if (!member) {
      return Response.json({ error: "Family member not found" }, { status: 404 })
    }

    return Response.json({ message: "Family member deleted" }, { status: 200 })
  } catch (error) {
    console.error(`[FamilyMember DELETE id=${id}] Error:`, error)
    return Response.json({ error: "Internal server error", details: String(error) }, { status: 500 })
  }
}
