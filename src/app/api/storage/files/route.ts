import { NextRequest } from "next/server"
import { z } from "zod"
import { connectDB } from "@/lib/mongodb"
import FileAsset from "@/models/FileAsset"
import { requireWorkspaceAccess, workspaceErrorResponse } from "@/lib/workspace-utils"

const SaveFileSchema = z.object({
  name: z.string().min(1).trim(),
  originalName: z.string().min(1).trim(),
  publicId: z.string().min(1),
  url: z.string().url(),
  resourceType: z.enum(["image", "raw"]),
  format: z.string().min(1),
  size: z.number().positive(),
})

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url)
    const workspaceId =
      request.headers.get("x-workspace-id") || url.searchParams.get("workspaceId")
    if (!workspaceId) return Response.json({ error: "Missing workspace context" }, { status: 400 })

    await requireWorkspaceAccess(workspaceId)
    await connectDB()

    const type = url.searchParams.get("type") // "image" | "raw" | null (all)
    const query: Record<string, unknown> = { workspaceId }
    if (type === "image" || type === "raw") query.resourceType = type

    const files = await FileAsset.find(query).sort({ createdAt: -1 })

    return Response.json({ files })
  } catch (error) {
    return workspaceErrorResponse(error)
  }
}

export async function POST(request: NextRequest) {
  try {
    const workspaceId = request.headers.get("x-workspace-id")
    if (!workspaceId) return Response.json({ error: "Missing workspace context" }, { status: 400 })

    const { userId } = await requireWorkspaceAccess(workspaceId)

    const body = await request.json()
    const parsed = SaveFileSchema.safeParse(body)
    if (!parsed.success) {
      return Response.json({ error: "Validation failed", issues: parsed.error.issues }, { status: 400 })
    }

    await connectDB()

    const file = await FileAsset.create({
      ...parsed.data,
      workspaceId,
      uploadedBy: userId,
    })

    return Response.json({ file }, { status: 201 })
  } catch (error) {
    return workspaceErrorResponse(error)
  }
}
