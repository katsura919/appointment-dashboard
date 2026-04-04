import { NextRequest } from "next/server"
import { z } from "zod"
import { connectDB } from "@/lib/mongodb"
import TrelloCard from "@/models/TrelloCard"
import TrelloPipeline from "@/models/TrelloPipeline"
import { requireWorkspaceAccess, workspaceErrorResponse } from "@/lib/workspace-utils"

const MoveCardSchema = z.object({
  pipelineId: z.string().min(1),
  position: z.number().int().min(0),
})

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    await connectDB()

    const card = await TrelloCard.findById(id)
    if (!card) return Response.json({ error: "Card not found" }, { status: 404 })

    await requireWorkspaceAccess(card.workspaceId.toString())

    const body = await request.json()
    const parsed = MoveCardSchema.safeParse(body)
    if (!parsed.success) {
      return Response.json({ error: "Validation failed", issues: parsed.error.issues }, { status: 400 })
    }

    const { pipelineId, position } = parsed.data
    const targetPipeline = await TrelloPipeline.findById(pipelineId)
    if (!targetPipeline || targetPipeline.workspaceId.toString() !== card.workspaceId.toString()) {
      return Response.json({ error: "Pipeline not found" }, { status: 404 })
    }

    const oldPipelineId = card.pipelineId.toString()
    const isSamePipeline = oldPipelineId === pipelineId

    if (isSamePipeline) {
      // Reorder within same pipeline
      const oldPos = card.position
      if (position > oldPos) {
        await TrelloCard.updateMany(
          { pipelineId, position: { $gt: oldPos, $lte: position }, _id: { $ne: id } },
          { $inc: { position: -1 } }
        )
      } else {
        await TrelloCard.updateMany(
          { pipelineId, position: { $gte: position, $lt: oldPos }, _id: { $ne: id } },
          { $inc: { position: 1 } }
        )
      }
    } else {
      // Moving to a different pipeline — close gap in source, open gap in target
      await TrelloCard.updateMany(
        { pipelineId: oldPipelineId, position: { $gt: card.position } },
        { $inc: { position: -1 } }
      )
      await TrelloCard.updateMany(
        { pipelineId, position: { $gte: position } },
        { $inc: { position: 1 } }
      )
    }

    card.pipelineId = pipelineId as unknown as typeof card.pipelineId
    card.position = position
    await card.save()

    return Response.json({ card })
  } catch (error) {
    return workspaceErrorResponse(error)
  }
}
