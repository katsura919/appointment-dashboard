import { NextRequest } from "next/server"
import { z } from "zod"
import { connectDB } from "@/lib/mongodb"
import TrelloProject from "@/models/TrelloProject"
import { requireWorkspaceAccess, canAdminister, workspaceErrorResponse } from "@/lib/workspace-utils"

const UpdateProjectSchema = z.object({
  name: z.string().min(1).trim().optional(),
  description: z.string().trim().optional(),
  color: z.string().optional(),
})

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    await connectDB()

    const project = await TrelloProject.findById(id)
    if (!project) return Response.json({ error: "Project not found" }, { status: 404 })

    const { member } = await requireWorkspaceAccess(project.workspaceId.toString())

    const body = await request.json()
    const parsed = UpdateProjectSchema.safeParse(body)
    if (!parsed.success) {
      return Response.json({ error: "Validation failed", issues: parsed.error.issues }, { status: 400 })
    }

    Object.assign(project, parsed.data)
    await project.save()

    return Response.json({ project })
  } catch (error) {
    return workspaceErrorResponse(error)
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    await connectDB()

    const project = await TrelloProject.findById(id)
    if (!project) return Response.json({ error: "Project not found" }, { status: 404 })

    const { member } = await requireWorkspaceAccess(project.workspaceId.toString())
    if (!canAdminister(member)) {
      return Response.json({ error: "Forbidden: Insufficient role" }, { status: 403 })
    }

    project.archivedAt = new Date()
    await project.save()

    return Response.json({ success: true })
  } catch (error) {
    return workspaceErrorResponse(error)
  }
}
