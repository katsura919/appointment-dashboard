"use client";

import * as React from "react";
import {
  isToday,
  isPast,
  isFuture,
  addDays,
  isWithinInterval,
  startOfDay,
} from "date-fns";
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
import { useWorkspaceId } from "@/hooks/use-workspace-id";
import type { AppointmentResponse, AppointmentStatus } from "@/lib/types";

function StatCard({
  label,
  value,
  icon: Icon,
  description,
}: {
  label: string;
  value: number;
  icon: React.ElementType;
  description: string;
}) {
  return (
    <Card className="@container/card bg-gradient-to-t from-primary/5 to-card shadow-xs dark:bg-card">
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
  const workspaceId = useWorkspaceId();
  const [appointments, setAppointments] = React.useState<AppointmentResponse[]>(
    [],
  );
  const [loading, setLoading] = React.useState(true);
  const [sheetOpen, setSheetOpen] = React.useState(false);
  const [editingAppointment, setEditingAppointment] =
    React.useState<AppointmentResponse | null>(null);

  const fetchAppointments = React.useCallback(async () => {
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

  React.useEffect(() => {
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
          appointment={editingAppointment}
          onSuccess={fetchAppointments}
        />
      )}
    </DashboardShell>
  );
}
