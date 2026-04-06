import { NextRequest } from "next/server"
import { z } from "zod"
import { connectDB } from "@/lib/mongodb"
import TrelloCard from "@/models/TrelloCard"
import { requireWorkspaceAccess, workspaceErrorResponse } from "@/lib/workspace-utils"
import { invalidateKeys, CacheKeys } from "@/lib/cache"

const LabelSchema = z.object({
  text: z.string().trim(),
  color: z.string(),
})

const ChecklistItemSchema = z.object({
  text: z.string().min(1).trim(),
  checked: z.boolean(),
})

const UpdateCardSchema = z.object({
  title: z.string().min(1).trim().optional(),
  description: z.string().trim().optional(),
  assigneeIds: z.array(z.string()).optional(),
  labels: z.array(LabelSchema).optional(),
  dueDate: z.string().datetime().nullable().optional(),
  checklist: z.array(ChecklistItemSchema).optional(),
  priority: z.enum(["urgent", "high", "medium", "low"]).optional(),
  coverColor: z.string().nullable().optional(),
  restore: z.boolean().optional(),
})

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    await connectDB()

    const card = await TrelloCard.findById(id)
    if (!card) return Response.json({ error: "Card not found" }, { status: 404 })

    await requireWorkspaceAccess(card.workspaceId.toString())

    const body = await request.json()
    const parsed = UpdateCardSchema.safeParse(body)
    if (!parsed.success) {
      return Response.json({ error: "Validation failed", issues: parsed.error.issues }, { status: 400 })
    }

    const { restore, ...rest } = parsed.data
    if (restore) {
      card.archivedAt = undefined
    } else {
      Object.assign(card, rest)
    }
    await card.save()
    await card.populate("assigneeIds", "name email")

    await invalidateKeys(
      CacheKeys.trelloBoard(card.projectId.toString()),
      CacheKeys.dashboardOverview(card.workspaceId.toString())
    )

    return Response.json({ card })
  } catch (error) {
    return workspaceErrorResponse(error)
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    await connectDB()

    const card = await TrelloCard.findById(id)
    if (!card) return Response.json({ error: "Card not found" }, { status: 404 })

    await requireWorkspaceAccess(card.workspaceId.toString())

    const projectId = card.projectId.toString()
    const workspaceId = card.workspaceId.toString()
    card.archivedAt = new Date()
    await card.save()

    await invalidateKeys(
      CacheKeys.trelloBoard(projectId),
      CacheKeys.dashboardOverview(workspaceId)
    )

    return Response.json({ success: true })
  } catch (error) {
    return workspaceErrorResponse(error)
  }
}
