import { NextRequest } from "next/server"
import { z } from "zod"
import { connectDB } from "@/lib/mongodb"
import StorageFolder from "@/models/StorageFolder"
import { requireWorkspaceAccess, workspaceErrorResponse } from "@/lib/workspace-utils"

const CreateFolderSchema = z.object({
  name: z.string().min(1).max(100).trim(),
})

export async function GET(request: NextRequest) {
  try {
    const workspaceId =
      request.headers.get("x-workspace-id") ||
      new URL(request.url).searchParams.get("workspaceId")
    if (!workspaceId) return Response.json({ error: "Missing workspace context" }, { status: 400 })

    await requireWorkspaceAccess(workspaceId)
    await connectDB()

    const folders = await StorageFolder.find({ workspaceId }).sort({ name: 1 })

    return Response.json({ folders })
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
    const parsed = CreateFolderSchema.safeParse(body)
    if (!parsed.success) {
      return Response.json({ error: "Validation failed", issues: parsed.error.issues }, { status: 400 })
    }

    await connectDB()

    const folder = await StorageFolder.create({
      name: parsed.data.name,
      workspaceId,
      createdBy: userId,
    })

    return Response.json({ folder }, { status: 201 })
  } catch (error) {
    return workspaceErrorResponse(error)
  }
}
