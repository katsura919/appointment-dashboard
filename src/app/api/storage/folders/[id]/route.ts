import { NextRequest } from "next/server"
import { z } from "zod"
import { connectDB } from "@/lib/mongodb"
import StorageFolder from "@/models/StorageFolder"
import FileAsset from "@/models/FileAsset"
import cloudinary from "@/lib/cloudinary"
import { requireWorkspaceAccess, workspaceErrorResponse } from "@/lib/workspace-utils"

const RenameFolderSchema = z.object({
  name: z.string().min(1).max(100).trim(),
})

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const workspaceId = request.headers.get("x-workspace-id")
    if (!workspaceId) return Response.json({ error: "Missing workspace context" }, { status: 400 })

    await requireWorkspaceAccess(workspaceId)
    await connectDB()

    const folder = await StorageFolder.findOne({ _id: id, workspaceId })
    if (!folder) return Response.json({ error: "Folder not found" }, { status: 404 })

    // Delete all files inside this folder from Cloudinary + DB
    const files = await FileAsset.find({ folderId: id, workspaceId })
    await Promise.all(
      files.map((f) =>
        cloudinary.uploader.destroy(f.publicId, { resource_type: f.resourceType })
      )
    )
    await FileAsset.deleteMany({ folderId: id, workspaceId })

    await folder.deleteOne()

    return Response.json({ success: true, deletedFiles: files.length })
  } catch (error) {
    return workspaceErrorResponse(error)
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const workspaceId = request.headers.get("x-workspace-id")
    if (!workspaceId) return Response.json({ error: "Missing workspace context" }, { status: 400 })

    await requireWorkspaceAccess(workspaceId)

    const body = await request.json()
    const parsed = RenameFolderSchema.safeParse(body)
    if (!parsed.success) {
      return Response.json({ error: "Validation failed", issues: parsed.error.issues }, { status: 400 })
    }

    await connectDB()

    const folder = await StorageFolder.findOneAndUpdate(
      { _id: id, workspaceId },
      { $set: { name: parsed.data.name } },
      { returnDocument: "after" }
    )
    if (!folder) return Response.json({ error: "Folder not found" }, { status: 404 })

    return Response.json({ folder })
  } catch (error) {
    return workspaceErrorResponse(error)
  }
}
