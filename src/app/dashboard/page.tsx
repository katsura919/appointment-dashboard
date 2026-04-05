"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { format, isToday, isTomorrow } from "date-fns";
import { formatInTimeZone } from "date-fns-tz";
import {
  CalendarIcon,
  ClockIcon,
  UsersIcon,
  ActivityIcon,
  KanbanIcon,
  AlertCircleIcon,
  ArrowRightIcon,
  SmileIcon,
  ZapIcon,
  MoonIcon,
  FolderKanbanIcon,
} from "lucide-react";
import { DashboardShell } from "@/components/dashboard-shell";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useWorkspace } from "@/contexts/workspace-context";
import type { AppointmentResponse, FamilyMemberResponse, WellBeingLogResponse } from "@/lib/types";

// ─── Types ───────────────────────────────────────────────────────────────────

interface ProjectSummary {
  _id: string;
  name: string;
  color?: string;
  cardCount: number;
}

interface OverviewData {
  appointments: {
    todayCount: number;
    thisWeekCount: number;
    overdueCount: number;
    next3: AppointmentResponse[];
  };
  family: {
    totalCount: number;
    members: FamilyMemberResponse[];
  };
  wellBeing: {
    latestLog: WellBeingLogResponse | null;
    weekAvg: {
      moodScore: number | null;
      energyLevel: number | null;
      sleepHours: number | null;
    };
  };
  projects: {
    activeCount: number;
    totalOpenCards: number;
    dueSoonCount: number;
    top3Projects: ProjectSummary[];
  };
}

// ─── WorkspaceClock ───────────────────────────────────────────────────────────

function WorkspaceClock({ timezone }: { timezone: string }) {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);
  
  const timeStr = formatInTimeZone(now, timezone, "hh:mm:ss aa");
  const dateStr = formatInTimeZone(now, timezone, "EEEE, MMMM d, yyyy");
  const tzLabel =
    timezone === "UTC"
      ? "UTC"
      : timezone.replace(/_/g, " ").split("/").pop() ?? timezone;

  return (
    <div className="flex items-center gap-3 px-4 lg:px-6">
      <div className="flex items-center gap-2 rounded-xl border bg-muted/40 px-4 py-2.5">
        <ClockIcon className="size-4 text-muted-foreground shrink-0" />
        <div className="flex items-baseline gap-2">
          <span className="text-xl font-semibold tabular-nums tracking-tight">
            {timeStr}
          </span>
          <span className="text-sm text-muted-foreground hidden sm:inline">
            {dateStr}
          </span>
        </div>
        <span className="ml-1 rounded-md bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
          {tzLabel}
        </span>
      </div>
    </div>
  );
}

// ─── Top Stat Cards ───────────────────────────────────────────────────────────

function TopStatCard({
  label,
  value,
  sub,
  icon: Icon,
  href,
  accent,
}: {
  label: string;
  value: number | string;
  sub: string;
  icon: React.ElementType;
  href: string;
  accent: string;
}) {
  return (
    <Link href={href}>
      <Card className="bg-card shadow-sm hover:shadow-md transition-shadow cursor-pointer h-full">
        <CardHeader className="pb-2">
          <CardDescription className="flex items-center gap-1.5">
            <span className={`inline-flex size-5 items-center justify-center rounded-md ${accent}`}>
              <Icon className="size-3 text-white" />
            </span>
            {label}
          </CardDescription>
          <CardTitle className="text-3xl font-semibold tabular-nums">
            {value}
          </CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-between text-sm text-muted-foreground">
          <span>{sub}</span>
          <ArrowRightIcon className="size-3.5" />
        </CardContent>
      </Card>
    </Link>
  );
}

function TopStatCardSkeleton() {
  return (
    <Card className="bg-card shadow-sm h-full">
      <CardHeader className="pb-2">
        <Skeleton className="h-4 w-28" />
        <Skeleton className="h-8 w-16 mt-1" />
      </CardHeader>
      <CardContent>
        <Skeleton className="h-4 w-36" />
      </CardContent>
    </Card>
  );
}

// ─── Appointments Section ─────────────────────────────────────────────────────

function formatAppointmentDate(dateStr: string) {
  const d = new Date(dateStr);
  if (isToday(d)) return "Today";
  if (isTomorrow(d)) return "Tomorrow";
  return format(d, "MMM d");
}

function AppointmentsCard({
  data,
}: {
  data: OverviewData["appointments"] | null;
}) {
  return (
    <Card className="shadow-sm flex flex-col">
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <div>
          <CardTitle className="text-base font-semibold">Upcoming Appointments</CardTitle>
          <CardDescription>Next scheduled events</CardDescription>
        </div>
        <Link
          href="/appointments"
          className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          View all <ArrowRightIcon className="size-3" />
        </Link>
      </CardHeader>
      <CardContent className="flex flex-col gap-2 flex-1">
        {data === null ? (
          // skeleton
          <>
            {[...Array(3)].map((_, i) => (
              <div key={i} className="flex items-center gap-3">
                <Skeleton className="size-9 rounded-lg shrink-0" />
                <div className="flex flex-col gap-1 flex-1">
                  <Skeleton className="h-3.5 w-3/4" />
                  <Skeleton className="h-3 w-1/2" />
                </div>
              </div>
            ))}
          </>
        ) : data.next3.length === 0 ? (
          <div className="flex flex-col items-center justify-center flex-1 py-6 gap-2 text-center">
            <CalendarIcon className="size-8 text-muted-foreground/40" />
            <p className="text-sm text-muted-foreground">No upcoming appointments</p>
            <Link
              href="/appointments?new=1"
              className="text-xs font-medium text-primary hover:underline"
            >
              Schedule one
            </Link>
          </div>
        ) : (
          data.next3.map((appt) => (
            <div key={appt._id} className="flex items-center gap-3 rounded-lg border bg-muted/30 px-3 py-2.5">
              <div className="flex flex-col items-center justify-center size-9 rounded-lg bg-primary/10 text-primary shrink-0">
                <span className="text-[10px] font-semibold leading-none uppercase">
                  {format(new Date(appt.startsAt), "MMM")}
                </span>
                <span className="text-sm font-bold leading-tight tabular-nums">
                  {format(new Date(appt.startsAt), "d")}
                </span>
              </div>
              <div className="flex flex-col min-w-0">
                <span className="text-sm font-medium truncate">{appt.title}</span>
                <span className="text-xs text-muted-foreground">
                  {formatAppointmentDate(appt.startsAt)} · {format(new Date(appt.startsAt), "h:mm aa")}
                </span>
              </div>
              {data.overdueCount > 0 && (
                <Badge variant="destructive" className="ml-auto shrink-0 text-[10px] px-1.5">
                  {data.overdueCount} overdue
                </Badge>
              )}
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}

// ─── Family Section ───────────────────────────────────────────────────────────

const ROLE_COLORS: Record<string, string> = {
  mom: "bg-rose-400",
  dad: "bg-blue-400",
  child: "bg-amber-400",
  other: "bg-slate-400",
};

function FamilyCard({ data }: { data: OverviewData["family"] | null }) {
  return (
    <Card className="shadow-sm flex flex-col">
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <div>
          <CardTitle className="text-base font-semibold">Family Members</CardTitle>
          <CardDescription>Your household</CardDescription>
        </div>
        <Link
          href="/family"
          className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          Manage <ArrowRightIcon className="size-3" />
        </Link>
      </CardHeader>
      <CardContent className="flex flex-col gap-3 flex-1">
        {data === null ? (
          <div className="flex gap-2">
            {[...Array(4)].map((_, i) => (
              <Skeleton key={i} className="size-10 rounded-full" />
            ))}
          </div>
        ) : data.members.length === 0 ? (
          <div className="flex flex-col items-center justify-center flex-1 py-6 gap-2 text-center">
            <UsersIcon className="size-8 text-muted-foreground/40" />
            <p className="text-sm text-muted-foreground">No family members added</p>
            <Link
              href="/family"
              className="text-xs font-medium text-primary hover:underline"
            >
              Add a member
            </Link>
          </div>
        ) : (
          <>
            <div className="flex flex-wrap gap-2">
              {data.members.map((member) => (
                <div key={member._id} className="flex flex-col items-center gap-1">
                  <Avatar className="size-10 border-2 border-background ring-2 ring-muted">
                    <AvatarFallback
                      className={`${ROLE_COLORS[member.role] ?? "bg-slate-400"} text-white text-xs font-semibold`}
                    >
                      {member.name.slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-[10px] text-muted-foreground leading-none truncate max-w-[40px]">
                    {member.name.split(" ")[0]}
                  </span>
                </div>
              ))}
            </div>
            <p className="text-xs text-muted-foreground mt-auto">
              {data.totalCount} member{data.totalCount !== 1 ? "s" : ""} in your workspace
            </p>
          </>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Well-Being Section ───────────────────────────────────────────────────────

function MetricBar({ label, value, max, icon: Icon, color }: {
  label: string;
  value: number | null;
  max: number;
  icon: React.ElementType;
  color: string;
}) {
  const pct = value != null ? Math.round((value / max) * 100) : 0;
  return (
    <div className="flex items-center gap-2">
      <Icon className={`size-3.5 shrink-0 ${color}`} />
      <span className="text-xs text-muted-foreground w-14 shrink-0">{label}</span>
      <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${color.replace("text-", "bg-")}`}
          style={{ width: value != null ? `${pct}%` : "0%" }}
        />
      </div>
      <span className="text-xs font-medium tabular-nums w-6 text-right">
        {value != null ? value : "—"}
      </span>
    </div>
  );
}

function WellBeingCard({ data }: { data: OverviewData["wellBeing"] | null }) {
  return (
    <Card className="shadow-sm flex flex-col">
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <div>
          <CardTitle className="text-base font-semibold">Well-Being</CardTitle>
          <CardDescription>7-day averages</CardDescription>
        </div>
        <Link
          href="/well-being"
          className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          View logs <ArrowRightIcon className="size-3" />
        </Link>
      </CardHeader>
      <CardContent className="flex flex-col gap-3 flex-1">
        {data === null ? (
          <>
            {[...Array(3)].map((_, i) => (
              <div key={i} className="flex items-center gap-2">
                <Skeleton className="size-3.5 rounded-full shrink-0" />
                <Skeleton className="h-3 w-14" />
                <Skeleton className="flex-1 h-1.5 rounded-full" />
                <Skeleton className="h-3 w-6" />
              </div>
            ))}
          </>
        ) : !data.latestLog && data.weekAvg.moodScore == null ? (
          <div className="flex flex-col items-center justify-center flex-1 py-6 gap-2 text-center">
            <ActivityIcon className="size-8 text-muted-foreground/40" />
            <p className="text-sm text-muted-foreground">No well-being logs yet</p>
            <Link
              href="/well-being"
              className="text-xs font-medium text-primary hover:underline"
            >
              Log today
            </Link>
          </div>
        ) : (
          <>
            <MetricBar
              label="Mood"
              value={data.weekAvg.moodScore}
              max={5}
              icon={SmileIcon}
              color="text-amber-500"
            />
            <MetricBar
              label="Energy"
              value={data.weekAvg.energyLevel}
              max={5}
              icon={ZapIcon}
              color="text-emerald-500"
            />
            <MetricBar
              label="Sleep"
              value={data.weekAvg.sleepHours}
              max={10}
              icon={MoonIcon}
              color="text-indigo-500"
            />
            {data.latestLog && (
              <p className="text-xs text-muted-foreground mt-auto">
                Last logged {format(new Date(data.latestLog.date), "MMM d")}
              </p>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Projects Section ─────────────────────────────────────────────────────────

function ProjectsCard({ data }: { data: OverviewData["projects"] | null }) {
  return (
    <Card className="shadow-sm flex flex-col">
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <div>
          <CardTitle className="text-base font-semibold">Projects</CardTitle>
          <CardDescription>Active boards</CardDescription>
        </div>
        <Link
          href="/projects"
          className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          View all <ArrowRightIcon className="size-3" />
        </Link>
      </CardHeader>
      <CardContent className="flex flex-col gap-2 flex-1">
        {data === null ? (
          <>
            {[...Array(3)].map((_, i) => (
              <div key={i} className="flex items-center gap-2.5">
                <Skeleton className="size-3 rounded-full shrink-0" />
                <Skeleton className="h-3.5 flex-1" />
                <Skeleton className="h-5 w-10 rounded-full" />
              </div>
            ))}
          </>
        ) : data.top3Projects.length === 0 ? (
          <div className="flex flex-col items-center justify-center flex-1 py-6 gap-2 text-center">
            <FolderKanbanIcon className="size-8 text-muted-foreground/40" />
            <p className="text-sm text-muted-foreground">No active projects</p>
            <Link
              href="/projects"
              className="text-xs font-medium text-primary hover:underline"
            >
              Create a project
            </Link>
          </div>
        ) : (
          <>
            {data.top3Projects.map((project) => (
              <Link
                key={project._id}
                href={`/projects/${project._id}`}
                className="flex items-center gap-2.5 rounded-lg border bg-muted/30 px-3 py-2 hover:bg-muted/60 transition-colors"
              >
                <span
                  className="size-2.5 rounded-full shrink-0"
                  style={{ backgroundColor: project.color ?? "#6366f1" }}
                />
                <span className="text-sm font-medium flex-1 truncate">{project.name}</span>
                <Badge variant="secondary" className="text-[10px] px-1.5 shrink-0">
                  {project.cardCount} card{project.cardCount !== 1 ? "s" : ""}
                </Badge>
              </Link>
            ))}
            {data.dueSoonCount > 0 && (
              <p className="text-xs text-amber-600 dark:text-amber-400 mt-auto flex items-center gap-1">
                <AlertCircleIcon className="size-3" />
                {data.dueSoonCount} card{data.dueSoonCount !== 1 ? "s" : ""} due this week
              </p>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const { activeWorkspace } = useWorkspace();
  const workspaceId = activeWorkspace?._id ?? null;
  const timezone = activeWorkspace?.timezone ?? "UTC";

  const [data, setData] = useState<OverviewData | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchOverview = useCallback(async () => {
    if (!workspaceId) {
      setData(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/dashboard/overview", {
        headers: { "x-workspace-id": workspaceId },
      });
      if (res.ok) {
        setData(await res.json());
      } else {
        setData(null);
      }
    } catch {
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [workspaceId]);

  useEffect(() => {
    fetchOverview();
  }, [fetchOverview]);

  const appts = loading ? null : (data?.appointments ?? { todayCount: 0, thisWeekCount: 0, overdueCount: 0, next3: [] });
  const family = loading ? null : (data?.family ?? { totalCount: 0, members: [] });
  const wellBeing = loading ? null : (data?.wellBeing ?? { latestLog: null, weekAvg: { moodScore: null, energyLevel: null, sleepHours: null } });
  const projects = loading ? null : (data?.projects ?? { activeCount: 0, totalOpenCards: 0, dueSoonCount: 0, top3Projects: [] });

  return (
    <DashboardShell title="Overview">
      <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
        {/* Clock */}
        <WorkspaceClock timezone={timezone} />

        {/* Top stat cards */}
        <div className="grid grid-cols-2 gap-4 px-4 lg:px-6 @xl/main:grid-cols-4">
          {loading ? (
            [...Array(4)].map((_, i) => <TopStatCardSkeleton key={i} />)
          ) : (
            <>
              <TopStatCard
                label="Appointments"
                value={appts?.todayCount ?? 0}
                sub={`${appts?.thisWeekCount ?? 0} more this week`}
                icon={CalendarIcon}
                href="/appointments"
                accent="bg-blue-500"
              />
              <TopStatCard
                label="Family"
                value={family?.totalCount ?? 0}
                sub="members in workspace"
                icon={UsersIcon}
                href="/family"
                accent="bg-rose-500"
              />
              <TopStatCard
                label="Well-Being"
                value={
                  wellBeing?.weekAvg.moodScore != null
                    ? `${wellBeing.weekAvg.moodScore}/5`
                    : "—"
                }
                sub="avg mood this week"
                icon={ActivityIcon}
                href="/well-being"
                accent="bg-emerald-500"
              />
              <TopStatCard
                label="Projects"
                value={projects?.activeCount ?? 0}
                sub={`${projects?.totalOpenCards ?? 0} open cards`}
                icon={KanbanIcon}
                href="/projects"
                accent="bg-violet-500"
              />
            </>
          )}
        </div>

        {/* 2×2 Section cards */}
        <div className="grid grid-cols-1 gap-4 px-4 lg:px-6 @xl/main:grid-cols-2">
          <AppointmentsCard data={appts} />
          <FamilyCard data={family} />
          <WellBeingCard data={wellBeing} />
          <ProjectsCard data={projects} />
        </div>
      </div>
    </DashboardShell>
  );
}
