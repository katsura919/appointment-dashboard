import { NextRequest } from "next/server"
import cloudinary from "@/lib/cloudinary"
import { requireWorkspaceAccess, workspaceErrorResponse } from "@/lib/workspace-utils"

export async function POST(request: NextRequest) {
  try {
    const workspaceId = request.headers.get("x-workspace-id")
    if (!workspaceId) return Response.json({ error: "Missing workspace context" }, { status: 400 })

    await requireWorkspaceAccess(workspaceId)

    const { resourceType } = await request.json()

    const timestamp = Math.round(Date.now() / 1000)
    const folder = `workspace/${workspaceId}`

    const paramsToSign: Record<string, string | number> = {
      timestamp,
      folder,
    }

    const signature = cloudinary.utils.api_sign_request(
      paramsToSign,
      process.env.CLOUDINARY_API_SECRET!
    )

    return Response.json({
      signature,
      timestamp,
      folder,
      apiKey: process.env.CLOUDINARY_API_KEY,
      cloudName: process.env.CLOUDINARY_CLOUD_NAME,
      resourceType: resourceType ?? "auto",
    })
  } catch (error) {
    return workspaceErrorResponse(error)
  }
}
