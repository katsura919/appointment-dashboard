import { NextRequest } from "next/server";
import { z } from "zod";
import {
  requireWorkspaceAccess,
  canManageMembers,
  canChangeRoles,
  isOwner,
  workspaceErrorResponse,
} from "@/lib/workspace-utils";

const UpdateRoleSchema = z.object({
  role: z.enum(["admin", "member"]),
});

// PATCH /api/workspaces/[id]/members/[userId] — change a member's role (owner only)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; userId: string }> }
) {
  const { id, userId: targetUserId } = await params;
  try {
    const { workspace, session, member } = await requireWorkspaceAccess(id);

    if (!canChangeRoles(member)) {
      return Response.json(
        { error: "Forbidden: Only the workspace owner can change member roles" },
        { status: 403 }
      );
    }

    // Cannot change own role
    if (targetUserId === session.user?.id) {
      return Response.json({ error: "You cannot change your own role" }, { status: 400 });
    }

    const body = await request.json();
    const parsed = UpdateRoleSchema.safeParse(body);
    if (!parsed.success) {
      return Response.json({ error: "Validation failed", issues: parsed.error.issues }, { status: 400 });
    }

    const targetMember = workspace.members.find(
      (m) => m.userId.toString() === targetUserId
    );

    if (!targetMember) {
      return Response.json({ error: "Member not found in this workspace" }, { status: 404 });
    }

    // Cannot change the role of the owner
    if (targetMember.role === "owner") {
      return Response.json({ error: "Cannot change the role of the workspace owner" }, { status: 400 });
    }

    targetMember.role = parsed.data.role;
    await workspace.save();

    return Response.json(
      { message: "Role updated successfully", userId: targetUserId, role: parsed.data.role },
      { status: 200 }
    );
  } catch (error) {
    return workspaceErrorResponse(error);
  }
}

// DELETE /api/workspaces/[id]/members/[userId] — remove a member or leave (owner/admin can remove; anyone can leave)
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; userId: string }> }
) {
  const { id, userId: targetUserId } = await params;
  try {
    const { workspace, session, member } = await requireWorkspaceAccess(id);

    const isSelf = targetUserId === session.user?.id;

    // Self-removal (leaving)
    if (isSelf) {
      if (isOwner(member)) {
        return Response.json(
          { error: "The workspace owner cannot leave. Delete the workspace instead." },
          { status: 400 }
        );
      }
    } else {
      // Removing someone else — must be owner or admin
      if (!canManageMembers(member)) {
        return Response.json(
          { error: "Forbidden: Only owner or admin can remove members" },
          { status: 403 }
        );
      }

      // Admin cannot remove the owner
      const targetMember = workspace.members.find(
        (m) => m.userId.toString() === targetUserId
      );
      if (targetMember?.role === "owner") {
        return Response.json({ error: "Cannot remove the workspace owner" }, { status: 400 });
      }
    }

    const before = workspace.members.length;
    workspace.members = workspace.members.filter(
      (m) => m.userId.toString() !== targetUserId
    ) as typeof workspace.members;

    if (workspace.members.length === before) {
      return Response.json({ error: "Member not found in this workspace" }, { status: 404 });
    }

    await workspace.save();

    return Response.json(
      { message: isSelf ? "You have left the workspace" : "Member removed from workspace" },
      { status: 200 }
    );
  } catch (error) {
    return workspaceErrorResponse(error);
  }
}
