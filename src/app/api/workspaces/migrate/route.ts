import { NextRequest } from "next/server";
import { auth } from "@/auth";
import { connectDB } from "@/lib/mongodb";
import Workspace from "@/models/Workspace";
import Appointment from "@/models/Appointment";
import FamilyMember from "@/models/FamilyMember";
import WellBeingLog from "@/models/WellBeingLog";
import User from "@/models/User";

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectDB();

    const users = await User.find({});
    const stats = { usersProcessed: 0, appointments: 0, familyMembers: 0, wellBeingLogs: 0 };

    for (const user of users) {
      // Find if they have a workspace
      let workspace = await Workspace.findOne({ ownerId: user._id });
      if (!workspace) {
        workspace = await Workspace.create({
          name: `${user.name || "Personal"} Workspace`,
          ownerId: user._id,
          members: [
            {
              userId: user._id,
              role: "owner",
            },
          ],
        });
      }

      // Migrate records
      const [appts, fams, wbls] = await Promise.all([
        Appointment.updateMany({ userId: user._id }, { $set: { workspaceId: workspace._id }, $unset: { userId: 1 } }),
        FamilyMember.updateMany({ userId: user._id }, { $set: { workspaceId: workspace._id }, $unset: { userId: 1 } }),
        WellBeingLog.updateMany({ userId: user._id }, { $set: { workspaceId: workspace._id }, $unset: { userId: 1 } }),
      ]);

      stats.appointments += appts.modifiedCount;
      stats.familyMembers += fams.modifiedCount;
      stats.wellBeingLogs += wbls.modifiedCount;
      stats.usersProcessed++;
    }

    return Response.json({ success: true, message: "Migration complete", stats }, { status: 200 });
  } catch (error) {
    console.error("[Workspaces Migrate] Error:", error);
    return Response.json(
      { error: "Internal server error", details: String(error) },
      { status: 500 }
    );
  }
}
