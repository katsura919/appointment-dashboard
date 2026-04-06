import { NextRequest } from "next/server"
import { z } from "zod"
import { connectDB } from "@/lib/mongodb"
import TrelloPipeline from "@/models/TrelloPipeline"
import TrelloCard from "@/models/TrelloCard"
import { requireWorkspaceAccess, workspaceErrorResponse } from "@/lib/workspace-utils"
import { invalidateKeys, CacheKeys } from "@/lib/cache"

const LabelSchema = z.object({
  text: z.string().trim(),
  color: z.string(),
})

const ChecklistItemSchema = z.object({
  text: z.string().min(1).trim(),
  checked: z.boolean().default(false),
})

const CreateCardSchema = z.object({
  pipelineId: z.string().min(1),
  title: z.string().min(1).trim(),
  description: z.string().trim().optional(),
  assigneeIds: z.array(z.string()).optional(),
  labels: z.array(LabelSchema).optional(),
  dueDate: z.string().datetime().optional(),
  checklist: z.array(ChecklistItemSchema).optional(),
})

export async function POST(request: NextRequest) {
  try {
    const workspaceId = request.headers.get("x-workspace-id")
    if (!workspaceId) return Response.json({ error: "Missing workspace context" }, { status: 400 })

    const { userId } = await requireWorkspaceAccess(workspaceId)

    const body = await request.json()
    const parsed = CreateCardSchema.safeParse(body)
    if (!parsed.success) {
      return Response.json({ error: "Validation failed", issues: parsed.error.issues }, { status: 400 })
    }

    await connectDB()

    const pipeline = await TrelloPipeline.findById(parsed.data.pipelineId)
    if (!pipeline || pipeline.workspaceId.toString() !== workspaceId) {
      return Response.json({ error: "Pipeline not found" }, { status: 404 })
    }

    const lastCard = await TrelloCard.findOne({ pipelineId: parsed.data.pipelineId })
      .sort({ position: -1 })
      .select("position")
    const position = lastCard ? lastCard.position + 1 : 0

    const card = await TrelloCard.create({
      ...parsed.data,
      projectId: pipeline.projectId,
      workspaceId,
      position,
      createdBy: userId,
    })

    await invalidateKeys(
      CacheKeys.trelloBoard(pipeline.projectId.toString()),
      CacheKeys.dashboardOverview(workspaceId)
    )

    return Response.json({ card }, { status: 201 })
  } catch (error) {
    return workspaceErrorResponse(error)
  }
}
