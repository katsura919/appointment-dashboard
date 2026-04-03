import { NextRequest } from "next/server";
import { z } from "zod";
import { requireWorkspaceAccess, canManageMembers, workspaceErrorResponse } from "@/lib/workspace-utils";
import { connectDB } from "@/lib/mongodb";
import User from "@/models/User";

const InviteSchema = z.object({
  email: z.string().email(),
  role: z.enum(["admin", "member"]).default("member"),
});

// GET /api/workspaces/[id]/members — list members with user info
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const { workspace } = await requireWorkspaceAccess(id);
    await connectDB();

    // Populate member user details
    const memberUserIds = workspace.members.map((m) => m.userId);
    const users = await User.find({ _id: { $in: memberUserIds } })
      .select("_id name email")
      .lean();

    const userMap = new Map(users.map((u) => [u._id.toString(), u]));

    const members = workspace.members.map((m) => {
      const user = userMap.get(m.userId.toString());
      return {
        userId: m.userId,
        role: m.role,
        name: user?.name ?? "Unknown",
        email: user?.email ?? "",
      };
    });

    return Response.json({ members }, { status: 200 });
  } catch (error) {
    return workspaceErrorResponse(error);
  }
}

// POST /api/workspaces/[id]/members — invite user by email (owner or admin)
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const { workspace, member } = await requireWorkspaceAccess(id);

    if (!canManageMembers(member)) {
      return Response.json(
        { error: "Forbidden: Only owner or admin can invite members" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const parsed = InviteSchema.safeParse(body);
    if (!parsed.success) {
      return Response.json({ error: "Validation failed", issues: parsed.error.issues }, { status: 400 });
    }

    await connectDB();

    // Look up user by email
    const invitee = await User.findOne({ email: parsed.data.email.toLowerCase() }).select("_id name email").lean();
    if (!invitee) {
      return Response.json(
        { error: "No account found with that email address. They need to register first." },
        { status: 404 }
      );
    }

    // Check if already a member
    const alreadyMember = workspace.members.some(
      (m) => m.userId.toString() === invitee._id.toString()
    );
    if (alreadyMember) {
      return Response.json(
        { error: "This user is already a member of the workspace" },
        { status: 409 }
      );
    }

    // Add the new member
    workspace.members.push({
      userId: invitee._id as unknown as string,
      role: parsed.data.role,
    });
    await workspace.save();

    return Response.json(
      {
        message: `${invitee.name} has been added to the workspace`,
        member: { userId: invitee._id, name: invitee.name, email: invitee.email, role: parsed.data.role },
      },
      { status: 201 }
    );
  } catch (error) {
    return workspaceErrorResponse(error);
  }
}
