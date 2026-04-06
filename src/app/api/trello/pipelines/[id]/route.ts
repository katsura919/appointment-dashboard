import { NextRequest } from "next/server"
import { z } from "zod"
import { connectDB } from "@/lib/mongodb"
import TrelloPipeline from "@/models/TrelloPipeline"
import TrelloCard from "@/models/TrelloCard"
import { requireWorkspaceAccess, canAdminister, workspaceErrorResponse } from "@/lib/workspace-utils"
import { invalidateKeys, CacheKeys } from "@/lib/cache"

const UpdatePipelineSchema = z.object({
  name: z.string().min(1).trim().optional(),
  color: z.string().optional(),
  wipLimit: z.number().int().min(1).nullable().optional(),
  restore: z.boolean().optional(),
})

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    await connectDB()

    const pipeline = await TrelloPipeline.findById(id)
    if (!pipeline) return Response.json({ error: "Pipeline not found" }, { status: 404 })

    await requireWorkspaceAccess(pipeline.workspaceId.toString())

    const body = await request.json()
    const parsed = UpdatePipelineSchema.safeParse(body)
    if (!parsed.success) {
      return Response.json({ error: "Validation failed", issues: parsed.error.issues }, { status: 400 })
    }

    const { restore, ...rest } = parsed.data
    if (restore) {
      pipeline.archivedAt = undefined
    } else {
      Object.assign(pipeline, rest)
    }
    await pipeline.save()

    await invalidateKeys(CacheKeys.trelloBoard(pipeline.projectId.toString()))

    return Response.json({ pipeline })
  } catch (error) {
    return workspaceErrorResponse(error)
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    await connectDB()

    const pipeline = await TrelloPipeline.findById(id)
    if (!pipeline) return Response.json({ error: "Pipeline not found" }, { status: 404 })

    const { member } = await requireWorkspaceAccess(pipeline.workspaceId.toString())
    if (!canAdminister(member)) {
      return Response.json({ error: "Forbidden: Insufficient role" }, { status: 403 })
    }

    // Archive pipeline and all its cards
    const now = new Date()
    const projectId = pipeline.projectId.toString()
    const workspaceId = pipeline.workspaceId.toString()
    pipeline.archivedAt = now
    await pipeline.save()
    await TrelloCard.updateMany({ pipelineId: id }, { archivedAt: now })

    await invalidateKeys(
      CacheKeys.trelloBoard(projectId),
      CacheKeys.dashboardOverview(workspaceId)
    )

    return Response.json({ success: true })
  } catch (error) {
    return workspaceErrorResponse(error)
  }
}
