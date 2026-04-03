import Workspace from "@/models/Workspace";
import { connectDB } from "@/lib/mongodb";
import { auth } from "@/auth";

export async function requireWorkspaceAccess(workspaceId: string, allowedRoles?: string[]) {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error("Unauthorized");
  }

  const userId = session.user.id;
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

  return { workspace, session, member };
}
