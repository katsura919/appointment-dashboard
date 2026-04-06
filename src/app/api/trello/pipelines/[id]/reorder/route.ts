import { NextRequest } from "next/server"
import { z } from "zod"
import { connectDB } from "@/lib/mongodb"
import TrelloPipeline from "@/models/TrelloPipeline"
import { requireWorkspaceAccess, workspaceErrorResponse } from "@/lib/workspace-utils"
import { invalidateKeys, CacheKeys } from "@/lib/cache"

const ReorderSchema = z.object({
  position: z.number().int().min(0), // target array index
})

/** Renumber all pipelines in a project with clean integer positions */
async function renumberPipelines(projectId: string) {
  const pipelines = await TrelloPipeline.find({ projectId, archivedAt: null })
    .sort({ position: 1 })
    .select("_id")
  await Promise.all(
    pipelines.map((p, i) => TrelloPipeline.updateOne({ _id: p._id }, { position: i }))
  )
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    await connectDB()

    const pipeline = await TrelloPipeline.findById(id)
    if (!pipeline) return Response.json({ error: "Pipeline not found" }, { status: 404 })

    await requireWorkspaceAccess(pipeline.workspaceId.toString())

    const body = await request.json()
    const parsed = ReorderSchema.safeParse(body)
    if (!parsed.success) {
      return Response.json({ error: "Validation failed", issues: parsed.error.issues }, { status: 400 })
    }

    const toIndex = parsed.data.position

    // Fetch siblings (excluding the pipeline being moved)
    const siblings = await TrelloPipeline.find({
      projectId: pipeline.projectId,
      _id: { $ne: id },
      archivedAt: null,
    })
      .sort({ position: 1 })
      .select("_id position")

    const prev = siblings[toIndex - 1]
    const next = siblings[toIndex]

    let newPosition: number
    if (!prev && !next) {
      newPosition = 0
    } else if (!prev) {
      newPosition = next.position - 1
    } else if (!next) {
      newPosition = prev.position + 1
    } else {
      newPosition = (prev.position + next.position) / 2
      if (Math.abs(next.position - prev.position) < 0.001) {
        await renumberPipelines(pipeline.projectId.toString())
        const refreshed = await TrelloPipeline.find({
          projectId: pipeline.projectId,
          _id: { $ne: id },
          archivedAt: null,
        })
          .sort({ position: 1 })
          .select("position")
        const rPrev = refreshed[toIndex - 1]
        const rNext = refreshed[toIndex]
        newPosition = rPrev && rNext
          ? (rPrev.position + rNext.position) / 2
          : rPrev ? rPrev.position + 1 : rNext ? rNext.position - 1 : 0
      }
    }

    pipeline.position = newPosition
    await pipeline.save()

    await invalidateKeys(CacheKeys.trelloBoard(pipeline.projectId.toString()))

    return Response.json({ pipeline })
  } catch (error) {
    return workspaceErrorResponse(error)
  }
}
