import { NextRequest } from "next/server"
import { z } from "zod"
import { connectDB } from "@/lib/mongodb"
import FileAsset from "@/models/FileAsset"
import cloudinary from "@/lib/cloudinary"
import { requireWorkspaceAccess, workspaceErrorResponse } from "@/lib/workspace-utils"

const RenameSchema = z.object({
  name: z.string().min(1).trim(),
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

    const file = await FileAsset.findOne({ _id: id, workspaceId })
    if (!file) return Response.json({ error: "File not found" }, { status: 404 })

    // Delete from Cloudinary
    await cloudinary.uploader.destroy(file.publicId, { resource_type: file.resourceType })

    await file.deleteOne()

    return Response.json({ success: true })
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
    const parsed = RenameSchema.safeParse(body)
    if (!parsed.success) {
      return Response.json({ error: "Validation failed", issues: parsed.error.issues }, { status: 400 })
    }

    await connectDB()

    const file = await FileAsset.findOneAndUpdate(
      { _id: id, workspaceId },
      { name: parsed.data.name },
      { new: true }
    )
    if (!file) return Response.json({ error: "File not found" }, { status: 404 })

    return Response.json({ file })
  } catch (error) {
    return workspaceErrorResponse(error)
  }
}
