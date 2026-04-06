import { NextRequest } from "next/server"
import { z } from "zod"
import { connectDB } from "@/lib/mongodb"
import TrelloProject from "@/models/TrelloProject"
import TrelloPipeline from "@/models/TrelloPipeline"
import { requireWorkspaceAccess, workspaceErrorResponse } from "@/lib/workspace-utils"
import { invalidateKeys, CacheKeys } from "@/lib/cache"

const CreatePipelineSchema = z.object({
  projectId: z.string().min(1),
  name: z.string().min(1).trim(),
  color: z.string().optional(),
})

export async function POST(request: NextRequest) {
  try {
    const workspaceId = request.headers.get("x-workspace-id")
    if (!workspaceId) return Response.json({ error: "Missing workspace context" }, { status: 400 })

    await requireWorkspaceAccess(workspaceId)

    const body = await request.json()
    const parsed = CreatePipelineSchema.safeParse(body)
    if (!parsed.success) {
      return Response.json({ error: "Validation failed", issues: parsed.error.issues }, { status: 400 })
    }

    await connectDB()

    const project = await TrelloProject.findById(parsed.data.projectId)
    if (!project || project.workspaceId.toString() !== workspaceId) {
      return Response.json({ error: "Project not found" }, { status: 404 })
    }

    // Get next position
    const lastPipeline = await TrelloPipeline.findOne({ projectId: parsed.data.projectId })
      .sort({ position: -1 })
      .select("position")
    const position = lastPipeline ? lastPipeline.position + 1 : 0

    const pipeline = await TrelloPipeline.create({
      ...parsed.data,
      workspaceId,
      position,
    })

    await invalidateKeys(
      CacheKeys.trelloBoard(parsed.data.projectId),
      CacheKeys.dashboardOverview(workspaceId)
    )

    return Response.json({ pipeline }, { status: 201 })
  } catch (error) {
    return workspaceErrorResponse(error)
  }
}
