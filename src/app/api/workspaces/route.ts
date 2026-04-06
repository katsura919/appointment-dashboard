import { NextRequest } from "next/server";
import { auth } from "@/auth";
import { connectDB } from "@/lib/mongodb";
import Workspace from "@/models/Workspace";
import { z } from "zod";

const CreateWorkspaceSchema = z.object({
  name: z.string().min(1).trim(),
  timezone: z.string().min(1).default("UTC"),
});

import { getServerUserId } from "@/lib/server-auth";
import { withCache, invalidateKeys, CacheKeys, CacheTTL } from "@/lib/cache";

export async function GET(request: NextRequest) {
  try {
    const userId = await getServerUserId();
    if (!userId) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const workspaces = await withCache(
      CacheKeys.workspaces(userId),
      CacheTTL.workspaces,
      async () => {
        await connectDB();
        return Workspace.find({ "members.userId": userId });
      }
    );

    return Response.json({ workspaces }, { status: 200 });
  } catch (error) {
    console.error("[Workspaces GET] Error:", error);
    return Response.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const userId = await getServerUserId();
    if (!userId) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const parsed = CreateWorkspaceSchema.safeParse(body);

    if (!parsed.success) {
      return Response.json(
        { error: "Validation failed", issues: parsed.error.issues },
        { status: 400 }
      );
    }

    await connectDB();

    const workspace = await Workspace.create({
      name: parsed.data.name,
      timezone: parsed.data.timezone,
      ownerId: userId,
      members: [
        {
          userId: userId,
          role: "owner",
        },
      ],
    });

    await invalidateKeys(CacheKeys.workspaces(userId))

    return Response.json({ workspace }, { status: 201 });
  } catch (error) {
    console.error("[Workspaces POST] Error:", error);
    return Response.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
