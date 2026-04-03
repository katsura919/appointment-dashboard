import { NextRequest } from "next/server"
import { z } from "zod"
import { connectDB } from "@/lib/mongodb"
import FamilyMember from "@/models/FamilyMember"
import { requireWorkspaceAccess } from "@/lib/workspace-utils"

const CreateFamilyMemberSchema = z.object({
  name: z.string().min(1).trim(),
  role: z.enum(["mom", "dad", "child", "other"]),
  dateOfBirth: z.string().datetime().optional(),
  avatar: z.string().optional(),
  contactNumber: z.string().optional(),
  email: z.string().email().optional().or(z.literal("")),
})

export async function GET(request: NextRequest) {
  try {
    const workspaceId = request.headers.get("x-workspace-id") || new URL(request.url).searchParams.get("workspaceId");
    if (!workspaceId) return Response.json({ error: "Missing workspace context" }, { status: 400 });

    const { workspace } = await requireWorkspaceAccess(workspaceId);

    const members = await FamilyMember.find({ workspaceId: workspace._id }).sort({ createdAt: 1 })

    return Response.json({ members }, { status: 200 })
  } catch (error) {
    console.error("[FamilyMembers GET] Error:", error);
    return Response.json({ error: "Internal server error", details: String(error) }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const workspaceId = request.headers.get("x-workspace-id") || new URL(request.url).searchParams.get("workspaceId");
    if (!workspaceId) return Response.json({ error: "Missing workspace context" }, { status: 400 });

    const { workspace } = await requireWorkspaceAccess(workspaceId);

    const body = await request.json()
    const parsed = CreateFamilyMemberSchema.safeParse(body)

    if (!parsed.success) {
      return Response.json(
        { error: "Validation failed", issues: parsed.error.issues },
        { status: 400 }
      )
    }

    const member = await FamilyMember.create({
        ...parsed.data,
        workspaceId: workspace._id
    })

    return Response.json({ member }, { status: 201 })
  } catch (error) {
    console.error("[FamilyMembers POST] Error:", error);
    return Response.json({ error: "Internal server error", details: String(error) }, { status: 500 })
  }
}
