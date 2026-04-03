import Workspace from "@/models/Workspace";
import { connectDB } from "@/lib/mongodb";
import { getServerUserId } from "@/lib/server-auth";
import type { IWorkspaceMember } from "@/models/Workspace";

export async function requireWorkspaceAccess(workspaceId: string, allowedRoles?: string[]) {
  const userId = await getServerUserId();
  if (!userId) {
    throw new Error("Unauthorized");
  }

  await connectDB();
  const workspace = await Workspace.findById(workspaceId);
  
  if (!workspace) {
    throw new Error("Workspace not found");
  }

  const member = workspace.members.find(
    (m) => m.userId.toString() === userId
  );

  if (!member) {
    throw new Error("Forbidden: You are not a member of this workspace");
  }

  if (allowedRoles && !allowedRoles.includes(member.role)) {
    throw new Error("Forbidden: Insufficient workspace role");
  }

  return { workspace, userId, member };
}

// Role helpers
export function isOwner(member: IWorkspaceMember) {
  return member.role === "owner";
}

export function canManageMembers(member: IWorkspaceMember) {
  return member.role === "owner" || member.role === "admin";
}

export function canAdminister(member: IWorkspaceMember) {
  return member.role === "owner" || member.role === "admin";
}

export function canChangeRoles(member: IWorkspaceMember) {
  return member.role === "owner";
}

/** Standardised error response wrapper for workspace access errors */
export function workspaceErrorResponse(error: unknown) {
  const message = error instanceof Error ? error.message : "Unknown error";
  if (message === "Unauthorized") return Response.json({ error: message }, { status: 401 });
  if (message.startsWith("Forbidden")) return Response.json({ error: message }, { status: 403 });
  if (message === "Workspace not found") return Response.json({ error: message }, { status: 404 });
  return Response.json({ error: "Internal server error", details: message }, { status: 500 });
}
