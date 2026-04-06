import { NextRequest } from "next/server"
import { connectDB } from "@/lib/mongodb"
import TrelloProject from "@/models/TrelloProject"
import TrelloPipeline from "@/models/TrelloPipeline"
import TrelloCard from "@/models/TrelloCard"
import User from "@/models/User"
import { requireWorkspaceAccess, workspaceErrorResponse } from "@/lib/workspace-utils"
import { withCache, CacheKeys, CacheTTL } from "@/lib/cache"

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    console.log("[Board GET] id:", id)

    await connectDB()
    console.log("[Board GET] DB connected")

    // Ensure User model is registered before populate runs
    User.modelName

    const project = await TrelloProject.findById(id)
    console.log("[Board GET] project:", project?._id ?? "not found")
    if (!project) return Response.json({ error: "Project not found" }, { status: 404 })

    await requireWorkspaceAccess(project.workspaceId.toString())

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
        console.log("[Board GET] pipelines:", pipelines.length, "cards:", cards.length)
        return { project, pipelines, cards }
      }
    )

    return Response.json(data)
  } catch (error) {
    console.error("[Board GET] ERROR:", error)
    return workspaceErrorResponse(error)
  }
}
