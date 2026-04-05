"use client";

import { ElementType, useCallback, useEffect, useState } from "react"

import {
  isToday,
  isPast,
  isFuture,
  addDays,
  isWithinInterval,
  startOfDay,
} from "date-fns";
import { format as formatTz } from "date-fns-tz";
import {
  CalendarIcon,
  ClockIcon,
  AlertCircleIcon,
  ListIcon,
} from "lucide-react";
import { DashboardShell } from "@/components/dashboard-shell";
import { AppointmentTable } from "@/components/appointment-table";
import { AppointmentSheet } from "@/components/appointment-sheet";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useWorkspace } from "@/contexts/workspace-context";
import type { AppointmentResponse, AppointmentStatus } from "@/lib/types";

function WorkspaceClock({ timezone }: { timezone: string }) {
  const [now, setNow] = useState(() => new Date())

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(id)
  }, [])

  const timeStr = formatTz(now, "hh:mm:ss aa", { timeZone: timezone })
  const dateStr = formatTz(now, "EEEE, MMMM d, yyyy", { timeZone: timezone })

  // Derive a friendly label from the IANA timezone string
  const tzLabel = timezone === "UTC"
    ? "UTC"
    : timezone.replace(/_/g, " ").split("/").pop() ?? timezone

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
  )
}

function StatCard({
  label,
  value,
  icon: Icon,
  description,
}: {
  label: string;
  value: number;
  icon: ElementType;
  description: string;
}) {
  return (
    <Card className="bg-card shadow-sm">
      <CardHeader>
        <CardDescription>{label}</CardDescription>
        <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
          {value}
        </CardTitle>
      </CardHeader>
      <CardContent className="flex items-center gap-2 text-sm text-muted-foreground">
        <Icon className="size-4 shrink-0" />
        {description}
      </CardContent>
    </Card>
  );
}

export default function DashboardPage() {
  const { activeWorkspace } = useWorkspace();
  const workspaceId = activeWorkspace?._id ?? null;
  const timezone = activeWorkspace?.timezone ?? "UTC";
  const [appointments, setAppointments] = useState<AppointmentResponse[]>(
    [],
  );
  const [loading, setLoading] = useState(true);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editingAppointment, setEditingAppointment] =
    useState<AppointmentResponse | null>(null);

  const fetchAppointments = useCallback(async () => {
    if (!workspaceId) {
      setAppointments([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`/api/appointments`, {
        headers: { "x-workspace-id": workspaceId },
      });
      if (!res.ok) {
        console.error(
          "[Dashboard] Failed to fetch appointments:",
          await res.text(),
        );
        setAppointments([]);
      } else {
        const data = await res.json();
        setAppointments(data.appointments ?? []);
      }
    } catch (error) {
      console.error("[Dashboard] Error fetching appointments:", error);
      setAppointments([]);
    } finally {
      setLoading(false);
    }
  }, [workspaceId]);

  useEffect(() => {
    fetchAppointments();
  }, [fetchAppointments]);

  async function handleStatusChange(id: string, status: AppointmentStatus) {
    await fetch(`/api/appointments/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json", "x-workspace-id": workspaceId ?? "" },
      body: JSON.stringify({ status }),
    });
    fetchAppointments();
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this appointment?")) return;
    await fetch(`/api/appointments/${id}`, { method: "DELETE", headers: { "x-workspace-id": workspaceId ?? "" } });
    fetchAppointments();
  }

  function handleEdit(a: AppointmentResponse) {
    setEditingAppointment(a);
    setSheetOpen(true);
  }

  function handleNew() {
    setEditingAppointment(null);
    setSheetOpen(true);
  }

  const now = new Date();
  const todayCount = appointments.filter(
    (a) => a.status === "upcoming" && isToday(new Date(a.startsAt)),
  ).length;
  const upcomingCount = appointments.filter((a) => {
    const d = new Date(a.startsAt);
    return (
      a.status === "upcoming" &&
      isFuture(d) &&
      !isToday(d) &&
      isWithinInterval(d, {
        start: startOfDay(addDays(now, 1)),
        end: addDays(now, 7),
      })
    );
  }).length;
  const overdueCount = appointments.filter(
    (a) =>
      a.status === "upcoming" &&
      isPast(new Date(a.startsAt)) &&
      !isToday(new Date(a.startsAt)),
  ).length;
  const totalUpcoming = appointments.filter(
    (a) => a.status === "upcoming",
  ).length;

  return (
    <DashboardShell title="Dashboard">
      <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
        {/* Workspace clock */}
        <WorkspaceClock timezone={timezone} />

        {/* Stat cards */}
        <div className="grid grid-cols-1 gap-4 px-4 lg:px-6 @xl/main:grid-cols-2 @5xl/main:grid-cols-4">
          <StatCard
            label="Today"
            value={todayCount}
            icon={CalendarIcon}
            description="appointments today"
          />
          <StatCard
            label="This Week"
            value={upcomingCount}
            icon={ClockIcon}
            description="in the next 7 days"
          />
          <StatCard
            label="Overdue"
            value={overdueCount}
            icon={AlertCircleIcon}
            description="need attention"
          />
          <StatCard
            label="Total Upcoming"
            value={totalUpcoming}
            icon={ListIcon}
            description="scheduled"
          />
        </div>

        {/* Table */}
        {loading ? (
          <div className="flex flex-col gap-3 px-4 lg:px-6">
            <Skeleton className="h-10 w-full rounded-lg" />
            {[...Array(8)].map((_, i) => (
              <Skeleton key={i} className="h-12 w-full rounded-lg" />
            ))}
          </div>
        ) : (
          <AppointmentTable
            appointments={appointments}
            onStatusChange={handleStatusChange}
            onEdit={handleEdit}
            onDelete={handleDelete}
            onNew={handleNew}
          />
        )}
      </div>

      {workspaceId && (
        <AppointmentSheet
          open={sheetOpen}
          onOpenChange={(open) => {
            setSheetOpen(open);
            if (!open) setEditingAppointment(null);
          }}
          workspaceId={workspaceId}
          timezone={timezone}
          appointment={editingAppointment}
          onSuccess={fetchAppointments}
        />
      )}
    </DashboardShell>
  );
}
