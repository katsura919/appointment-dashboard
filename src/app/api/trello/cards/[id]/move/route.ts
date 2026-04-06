import { NextRequest } from "next/server"
import { z } from "zod"
import { connectDB } from "@/lib/mongodb"
import TrelloCard from "@/models/TrelloCard"
import TrelloPipeline from "@/models/TrelloPipeline"
import { requireWorkspaceAccess, workspaceErrorResponse } from "@/lib/workspace-utils"
import { invalidateKeys, CacheKeys } from "@/lib/cache"

const MoveCardSchema = z.object({
  pipelineId: z.string().min(1),
  position: z.number().int().min(0), // target array index
})

/** Renumber all cards in a pipeline with clean integer positions */
async function renumberCards(pipelineId: string) {
  const cards = await TrelloCard.find({ pipelineId, archivedAt: null })
    .sort({ position: 1 })
    .select("_id")
  await Promise.all(cards.map((c, i) => TrelloCard.updateOne({ _id: c._id }, { position: i })))
}

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

    const { pipelineId, position: toIndex } = parsed.data
    const targetPipeline = await TrelloPipeline.findById(pipelineId)
    if (!targetPipeline || targetPipeline.workspaceId.toString() !== card.workspaceId.toString()) {
      return Response.json({ error: "Pipeline not found" }, { status: 404 })
    }

    const oldPipelineId = card.pipelineId.toString()
    const isSamePipeline = oldPipelineId === pipelineId

    // Fetch siblings in the target pipeline (excluding the card being moved)
    const siblings = await TrelloCard.find({
      pipelineId,
      _id: { $ne: id },
      archivedAt: null,
    })
      .sort({ position: 1 })
      .select("_id position")

    // Compute fractional position from neighbours at toIndex
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
      // If delta too small, renumber and recalculate
      if (Math.abs(next.position - prev.position) < 0.001) {
        await renumberCards(pipelineId)
        if (!isSamePipeline) await renumberCards(oldPipelineId)
        const refreshed = await TrelloCard.find({
          pipelineId,
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

    card.pipelineId = pipelineId as unknown as typeof card.pipelineId
    card.position = newPosition
    await card.save()

    await invalidateKeys(CacheKeys.trelloBoard(card.projectId.toString()))

    return Response.json({ card })
  } catch (error) {
    return workspaceErrorResponse(error)
  }
}
