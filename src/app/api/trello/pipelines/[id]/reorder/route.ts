import { NextRequest } from "next/server"
import { z } from "zod"
import { connectDB } from "@/lib/mongodb"
import TrelloPipeline from "@/models/TrelloPipeline"
import { requireWorkspaceAccess, workspaceErrorResponse } from "@/lib/workspace-utils"

const ReorderSchema = z.object({
  position: z.number().int().min(0),
})

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

    const oldPosition = pipeline.position
    const newPosition = parsed.data.position

    if (oldPosition === newPosition) return Response.json({ pipeline })

    // Shift other pipelines to make room
    if (newPosition > oldPosition) {
      await TrelloPipeline.updateMany(
        { projectId: pipeline.projectId, position: { $gt: oldPosition, $lte: newPosition } },
        { $inc: { position: -1 } }
      )
    } else {
      await TrelloPipeline.updateMany(
        { projectId: pipeline.projectId, position: { $gte: newPosition, $lt: oldPosition } },
        { $inc: { position: 1 } }
      )
    }

    pipeline.position = newPosition
    await pipeline.save()

    return Response.json({ pipeline })
  } catch (error) {
    return workspaceErrorResponse(error)
  }
}
