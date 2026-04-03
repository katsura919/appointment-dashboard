import { NextRequest } from "next/server";
import { z } from "zod";
import { requireWorkspaceAccess, canAdminister, isOwner, workspaceErrorResponse } from "@/lib/workspace-utils";
import { connectDB } from "@/lib/mongodb";

const RenameSchema = z.object({
  name: z.string().min(1).max(80).trim(),
});

// PATCH /api/workspaces/[id] — rename workspace (owner or admin)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const { workspace, member } = await requireWorkspaceAccess(id);

    if (!canAdminister(member)) {
      return Response.json({ error: "Forbidden: Only owner or admin can rename the workspace" }, { status: 403 });
    }

    const body = await request.json();
    const parsed = RenameSchema.safeParse(body);
    if (!parsed.success) {
      return Response.json({ error: "Validation failed", issues: parsed.error.issues }, { status: 400 });
    }

    workspace.name = parsed.data.name;
    await workspace.save();

    return Response.json({ workspace }, { status: 200 });
  } catch (error) {
    return workspaceErrorResponse(error);
  }
}

// DELETE /api/workspaces/[id] — delete workspace (owner only)
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const { workspace, member } = await requireWorkspaceAccess(id);

    if (!isOwner(member)) {
      return Response.json({ error: "Forbidden: Only the workspace owner can delete it" }, { status: 403 });
    }

    // Block deletion if other members still exist
    const otherMembers = workspace.members.filter(
      (m) => m.userId.toString() !== member.userId.toString()
    );
    if (otherMembers.length > 0) {
      return Response.json(
        { error: "Cannot delete: remove all other members first before deleting the workspace" },
        { status: 409 }
      );
    }

    await connectDB();
    await workspace.deleteOne();

    return Response.json({ message: "Workspace deleted successfully" }, { status: 200 });
  } catch (error) {
    return workspaceErrorResponse(error);
  }
}
