import { NextRequest } from "next/server"
import { connectDB } from "@/lib/mongodb"
import { requireWorkspaceAccess, workspaceErrorResponse } from "@/lib/workspace-utils"
import Appointment from "@/models/Appointment"
import FamilyMember from "@/models/FamilyMember"
import WellBeingLog from "@/models/WellBeingLog"
import TrelloProject from "@/models/TrelloProject"
import TrelloCard from "@/models/TrelloCard"

export async function GET(request: NextRequest) {
  try {
    const workspaceId =
      request.headers.get("x-workspace-id") ||
      new URL(request.url).searchParams.get("workspaceId")
    if (!workspaceId)
      return Response.json({ error: "Missing workspace context" }, { status: 400 })

    const { workspace } = await requireWorkspaceAccess(workspaceId)
    await connectDB()

    const wid = workspace._id
    const now = new Date()
    const startOfToday = new Date(now)
    startOfToday.setHours(0, 0, 0, 0)
    const endOfToday = new Date(now)
    endOfToday.setHours(23, 59, 59, 999)
    const sevenDaysOut = new Date(now)
    sevenDaysOut.setDate(sevenDaysOut.getDate() + 7)
    const sevenDaysAgo = new Date(now)
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

    const [
      todayAppointments,
      thisWeekAppointments,
      overdueAppointments,
      nextAppointments,
      familyMembers,
      recentWellBeingLogs,
      activeProjects,
    ] = await Promise.all([
      // Today's upcoming appointments
      Appointment.countDocuments({
        workspaceId: wid,
        status: "upcoming",
        startsAt: { $gte: startOfToday, $lte: endOfToday },
        deletedAt: { $exists: false },
      }),
      // This week (tomorrow → 7 days out)
      Appointment.countDocuments({
        workspaceId: wid,
        status: "upcoming",
        startsAt: { $gt: endOfToday, $lte: sevenDaysOut },
        deletedAt: { $exists: false },
      }),
      // Overdue (past, still "upcoming")
      Appointment.countDocuments({
        workspaceId: wid,
        status: "upcoming",
        startsAt: { $lt: startOfToday },
        deletedAt: { $exists: false },
      }),
      // Next 3 upcoming (today + future)
      Appointment.find({
        workspaceId: wid,
        status: "upcoming",
        startsAt: { $gte: startOfToday },
        deletedAt: { $exists: false },
      })
        .sort({ startsAt: 1 })
        .limit(3)
        .populate("memberIds", "name role color avatar"),
      // All family members
      FamilyMember.find({ workspaceId: wid, deletedAt: { $exists: false } }).sort({ createdAt: 1 }),
      // Last 7 well-being logs
      WellBeingLog.find({
        workspaceId: wid,
        date: { $gte: sevenDaysAgo },
      }).sort({ date: -1 }),
      // Active projects
      TrelloProject.find({ workspaceId: wid, archivedAt: { $exists: false } }).sort({ createdAt: -1 }),
    ])

    // Well-being: latest log + 7-day averages
    const latestLog = recentWellBeingLogs[0] ?? null
    const weekAvg = (() => {
      if (!recentWellBeingLogs.length) return { moodScore: null, energyLevel: null, sleepHours: null }
      const sum = { mood: 0, energy: 0, sleep: 0 }
      const count = { mood: 0, energy: 0, sleep: 0 }
      for (const log of recentWellBeingLogs) {
        if (log.metrics.moodScore != null) { sum.mood += log.metrics.moodScore; count.mood++ }
        if (log.metrics.energyLevel != null) { sum.energy += log.metrics.energyLevel; count.energy++ }
        if (log.metrics.sleepHours != null) { sum.sleep += log.metrics.sleepHours; count.sleep++ }
      }
      return {
        moodScore: count.mood ? Math.round((sum.mood / count.mood) * 10) / 10 : null,
        energyLevel: count.energy ? Math.round((sum.energy / count.energy) * 10) / 10 : null,
        sleepHours: count.sleep ? Math.round((sum.sleep / count.sleep) * 10) / 10 : null,
      }
    })()

    // Projects: open card counts + due-soon per project
    let totalOpenCards = 0
    let dueSoonCount = 0
    const projectIds = activeProjects.map((p) => p._id)

    const cardAggregation =
      projectIds.length > 0
        ? await TrelloCard.aggregate([
            {
              $match: {
                workspaceId: wid,
                projectId: { $in: projectIds },
                archivedAt: { $exists: false },
              },
            },
            {
              $group: {
                _id: "$projectId",
                cardCount: { $sum: 1 },
                dueSoonCount: {
                  $sum: {
                    $cond: [
                      {
                        $and: [
                          { $ne: ["$dueDate", null] },
                          { $lte: ["$dueDate", sevenDaysOut] },
                          { $gte: ["$dueDate", now] },
                        ],
                      },
                      1,
                      0,
                    ],
                  },
                },
              },
            },
          ])
        : []

    const cardCountMap = new Map<string, { cardCount: number; dueSoonCount: number }>()
    for (const row of cardAggregation) {
      cardCountMap.set(row._id.toString(), {
        cardCount: row.cardCount,
        dueSoonCount: row.dueSoonCount,
      })
      totalOpenCards += row.cardCount
      dueSoonCount += row.dueSoonCount
    }

    const top3Projects = activeProjects.slice(0, 3).map((p) => {
      const counts = cardCountMap.get(p._id.toString()) ?? { cardCount: 0, dueSoonCount: 0 }
      return {
        _id: p._id,
        name: p.name,
        color: p.color,
        cardCount: counts.cardCount,
      }
    })

    return Response.json({
      appointments: {
        todayCount: todayAppointments,
        thisWeekCount: thisWeekAppointments,
        overdueCount: overdueAppointments,
        next3: nextAppointments,
      },
      family: {
        totalCount: familyMembers.length,
        members: familyMembers,
      },
      wellBeing: {
        latestLog,
        weekAvg,
      },
      projects: {
        activeCount: activeProjects.length,
        totalOpenCards,
        dueSoonCount,
        top3Projects,
      },
    })
  } catch (error) {
    return workspaceErrorResponse(error)
  }
}
