import { NextRequest } from "next/server"
import { z } from "zod"
import { connectDB } from "@/lib/mongodb"
import TrelloProject from "@/models/TrelloProject"
import { requireWorkspaceAccess, workspaceErrorResponse } from "@/lib/workspace-utils"

const CreateProjectSchema = z.object({
  name: z.string().min(1).trim(),
  description: z.string().trim().optional(),
  color: z.string().optional(),
})

export async function GET(request: NextRequest) {
  try {
    const workspaceId =
      request.headers.get("x-workspace-id") ||
      new URL(request.url).searchParams.get("workspaceId")
    if (!workspaceId) return Response.json({ error: "Missing workspace context" }, { status: 400 })

    await requireWorkspaceAccess(workspaceId)
    await connectDB()

    const projects = await TrelloProject.find({
      workspaceId,
      archivedAt: { $exists: false },
    }).sort({ createdAt: -1 })

    return Response.json({ projects })
  } catch (error) {
    return workspaceErrorResponse(error)
  }
}

export async function POST(request: NextRequest) {
  try {
    const workspaceId = request.headers.get("x-workspace-id")
    if (!workspaceId) return Response.json({ error: "Missing workspace context" }, { status: 400 })

    const { userId, workspace } = await requireWorkspaceAccess(workspaceId)

    const body = await request.json()
    const parsed = CreateProjectSchema.safeParse(body)
    if (!parsed.success) {
      return Response.json({ error: "Validation failed", issues: parsed.error.issues }, { status: 400 })
    }

    await connectDB()

    const project = await TrelloProject.create({
      ...parsed.data,
      workspaceId: workspace._id,
      createdBy: userId,
    })

    return Response.json({ project }, { status: 201 })
  } catch (error) {
    return workspaceErrorResponse(error)
  }
}
