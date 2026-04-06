import { NextRequest } from "next/server"
import { connectDB } from "@/lib/mongodb"
import TrelloProject from "@/models/TrelloProject"
import TrelloPipeline from "@/models/TrelloPipeline"
import TrelloCard from "@/models/TrelloCard"
import User from "@/models/User"
import { requireWorkspaceAccess, workspaceErrorResponse } from "@/lib/workspace-utils"
import { withCache, CacheKeys, CacheTTL } from "@/lib/cache"

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const archived = request.nextUrl.searchParams.get("archived") === "true"

    await connectDB()

    // Ensure User model is registered before populate runs
    User.modelName

    const project = await TrelloProject.findById(id)
    if (!project) return Response.json({ error: "Project not found" }, { status: 404 })

    await requireWorkspaceAccess(project.workspaceId.toString())

    // Archived view bypasses cache — it's a read-only recovery surface
    if (archived) {
      const [pipelines, cards] = await Promise.all([
        TrelloPipeline.find({ projectId: id, archivedAt: { $ne: null } }).sort({ archivedAt: -1 }),
        TrelloCard.find({ projectId: id, archivedAt: { $ne: null } })
          .populate("assigneeIds", "name email")
          .sort({ archivedAt: -1 }),
      ])
      return Response.json({ project, pipelines, cards })
    }

    const data = await withCache(
      CacheKeys.trelloBoard(id),
      CacheTTL.trelloBoard,
      async () => {
        const [pipelines, cards] = await Promise.all([
          TrelloPipeline.find({ projectId: id, archivedAt: null }).sort({ position: 1 }),
          TrelloCard.find({ projectId: id, archivedAt: null })
            .populate("assigneeIds", "name email")
            .sort({ position: 1 }),
        ])
        return { project, pipelines, cards }
      }
    )

    return Response.json(data)
  } catch (error) {
    return workspaceErrorResponse(error)
  }
}
