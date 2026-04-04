"use client"

import { ElementType, useCallback, useEffect, useMemo, useState } from "react"

import "react-big-calendar/lib/css/react-big-calendar.css"

import { Calendar, dateFnsLocalizer, Views } from "react-big-calendar"
import { format, parse, startOfWeek, getDay, addHours } from "date-fns"
import { enUS } from "date-fns/locale"
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  CalendarDaysIcon,
  LayoutGridIcon,
  ListIcon,
  ClockIcon,
  PlusIcon,
} from "lucide-react"

import { DashboardShell } from "@/components/dashboard-shell"
import { AppointmentSheet } from "@/components/appointment-sheet"
import { CategoryBadge } from "@/components/category-badge"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { CATEGORY_META, type AppointmentCategory } from "@/lib/categories"
import { useWorkspaceId } from "@/hooks/use-workspace-id"
import type { AppointmentResponse } from "@/lib/types"

// ─── date-fns localizer ───────────────────────────────────────────────────────

const locales = { "en-US": enUS }

const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek: () => startOfWeek(new Date(), { locale: enUS }),
  getDay,
  locales,
})

// ─── Category event colors (raw CSS values for rbc) ──────────────────────────

const CATEGORY_COLORS: Record<AppointmentCategory, { bg: string; color: string }> = {
  health_wellness:       { bg: "#dbeafe", color: "#1d4ed8" },
  education_development: { bg: "#ede9fe", color: "#7c3aed" },
  activities_enrichment: { bg: "#dcfce7", color: "#16a34a" },
  life_logistics:        { bg: "#fed7aa", color: "#c2410c" },
  family_relationship:   { bg: "#ffe4e6", color: "#be123c" },
  administrative:        { bg: "#f1f5f9", color: "#475569" },
  mom_personal_care:     { bg: "#ccfbf1", color: "#0f766e" },
}

// ─── Calendar event type ──────────────────────────────────────────────────────

interface CalendarEvent {
  id: string
  title: string
  start: Date
  end: Date
  resource: AppointmentResponse
}

function toCalendarEvents(appointments: AppointmentResponse[]): CalendarEvent[] {
  return appointments.map((a) => {
    const start = new Date(a.startsAt || a.date || "")
    if (a.time && !a.startsAt) {
      const [h, m] = a.time.split(":").map(Number)
      start.setHours(h, m, 0, 0)
    }
    const end = a.endsAt ? new Date(a.endsAt) : addHours(start, 1)
    return { id: a._id, title: a.title, start, end, resource: a }
  })
}

// ─── Custom toolbar ───────────────────────────────────────────────────────────

type CalendarView = "month" | "week" | "day" | "agenda"

interface ToolbarProps {
  date: Date
  view: CalendarView
  label: string
  onNavigate: (action: "PREV" | "NEXT" | "TODAY") => void
  onView: (view: CalendarView) => void
  onNew: () => void
}

const VIEW_OPTIONS: { value: CalendarView; label: string; icon: ElementType }[] = [
  { value: "month",  label: "Month",  icon: LayoutGridIcon },
  { value: "week",   label: "Week",   icon: CalendarDaysIcon },
  { value: "day",    label: "Day",    icon: ClockIcon },
  { value: "agenda", label: "Agenda", icon: ListIcon },
]

function CalendarToolbar({ date, view, label, onNavigate, onView, onNew }: ToolbarProps) {
  return (
    <div className="flex items-center justify-between gap-3 mb-4 flex-wrap">
      {/* Navigation */}
      <div className="flex items-center gap-2">
        <Button
          className="cursor-pointer"
          variant="outline"
          size="icon"
          onClick={() => onNavigate("PREV")}
        >
          <ChevronLeftIcon className="size-4" />
        </Button>
        <Button
          className="cursor-pointer"
          variant="outline"
          size="sm"
          onClick={() => onNavigate("TODAY")}
        >
          Today
        </Button>
        <Button
          className="cursor-pointer"
          variant="outline"
          size="icon"
          onClick={() => onNavigate("NEXT")}
        >
          <ChevronRightIcon className="size-4" />
        </Button>
        <span className="text-base font-semibold ml-1">{label}</span>
      </div>

      {/* View switcher + New button */}
      <div className="flex items-center gap-2">
        <div className="flex rounded-md border overflow-hidden">
          {VIEW_OPTIONS.map(({ value, label: vLabel, icon: Icon }) => (
            <button
              key={value}
              onClick={() => onView(value)}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-sm transition-colors border-r last:border-r-0 cursor-pointer ${
                view === value
                  ? "bg-primary text-primary-foreground"
                  : "bg-card text-muted-foreground hover:bg-muted"
              }`}
            >
              <Icon className="size-3.5" />
              <span className="hidden sm:inline">{vLabel}</span>
            </button>
          ))}
        </div>
        <Button className="cursor-pointer" size="sm" onClick={onNew}>
          <PlusIcon className="size-4" />
          <span className="hidden sm:inline">New</span>
        </Button>
      </div>
    </div>
  );
}

// ─── Category legend ──────────────────────────────────────────────────────────

function CategoryLegend({
  active,
  onToggle,
}: {
  active: Set<AppointmentCategory>
  onToggle: (cat: AppointmentCategory) => void
}) {
  return (
    <div className="flex flex-wrap gap-2 mb-4">
      {(Object.keys(CATEGORY_META) as AppointmentCategory[]).map((cat) => {
        const meta = CATEGORY_META[cat]
        const isOn = active.has(cat)
        return (
          <button
            key={cat}
            onClick={() => onToggle(cat)}
            className={`transition-opacity cursor-pointer ${isOn ? "opacity-100" : "opacity-40"}`}
          >
            <CategoryBadge category={cat} />
          </button>
        )
      })}
    </div>
  )
}

// ─── Event component ──────────────────────────────────────────────────────────

function EventComponent({ event }: { event: CalendarEvent }) {
  const apt = event.resource
  const isCompleted = apt.status === "completed"
  const isCancelled = apt.status === "cancelled"
  const members = apt.memberIds?.length > 0 ? apt.memberIds : (apt.memberId ? [apt.memberId] : [])
  const names = members.map(m => m.name).join(", ")

  return (
    <span
      className={`block truncate text-xs font-medium ${
        isCompleted || isCancelled ? "line-through opacity-60" : ""
      }`}
      title={`${apt.title} — ${names}`}
    >
      {apt.title}
    </span>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AppointmentsPage() {
  const workspaceId = useWorkspaceId()

  const [appointments, setAppointments] = useState<AppointmentResponse[]>([])
  const [loading, setLoading] = useState(true)
  const [view, setView] = useState<CalendarView>("month")
  const [date, setDate] = useState(new Date())
  const [activeCategories, setActiveCategories] = useState<Set<AppointmentCategory>>(
    new Set(Object.keys(CATEGORY_META) as AppointmentCategory[])
  )

  const [sheetOpen, setSheetOpen] = useState(false)
  const [editingAppointment, setEditingAppointment] =
    useState<AppointmentResponse | null>(null)
  const [defaultDate, setDefaultDate] = useState<string | undefined>()

  const fetchAppointments = useCallback(async () => {
    if (!workspaceId) return
    setLoading(true)
    try {
      const res = await fetch(`/api/appointments`, {
        headers: { "x-workspace-id": workspaceId },
      })
      const data = await res.json()
      setAppointments(data.appointments ?? [])
    } catch {
      // silently fail
    } finally {
      setLoading(false)
    }
  }, [workspaceId])

  useEffect(() => {
    fetchAppointments()
  }, [fetchAppointments])

  // Filter by active categories
  const visibleAppointments = useMemo(
    () => appointments.filter((a) => activeCategories.has(a.category)),
    [appointments, activeCategories]
  )

  const events = useMemo(
    () => toCalendarEvents(visibleAppointments),
    [visibleAppointments]
  )

  function toggleCategory(cat: AppointmentCategory) {
    setActiveCategories((prev) => {
      const next = new Set(prev)
      if (next.has(cat)) {
        if (next.size === 1) return prev // keep at least one active
        next.delete(cat)
      } else {
        next.add(cat)
      }
      return next
    })
  }

  function handleSelectEvent(event: CalendarEvent) {
    setEditingAppointment(event.resource)
    setDefaultDate(undefined)
    setSheetOpen(true)
  }

  function handleSelectSlot({ start }: { start: Date }) {
    setEditingAppointment(null)
    setDefaultDate(format(start, "yyyy-MM-dd"))
    setSheetOpen(true)
  }

  function handleSheetClose(open: boolean) {
    setSheetOpen(open)
    if (!open) {
      setEditingAppointment(null)
      setDefaultDate(undefined)
    }
  }

  // eventPropGetter — colors by category, dims completed/cancelled
  function eventPropGetter(event: CalendarEvent) {
    const cat = event.resource.category as AppointmentCategory
    const colors = CATEGORY_COLORS[cat] ?? { bg: "#f1f5f9", color: "#475569" }
    const isDimmed =
      event.resource.status === "completed" || event.resource.status === "cancelled"

    return {
      style: {
        backgroundColor: colors.bg,
        color: colors.color,
        opacity: isDimmed ? 0.55 : 1,
        border: "none",
      },
    }
  }

  return (
    <DashboardShell title="Appointments">
      <div className="flex flex-col gap-2 py-4 px-4 lg:px-6 md:py-6">
        {/* Custom toolbar */}
        <CalendarToolbar
          date={date}
          view={view}
          label={format(
            date,
            view === "month"
              ? "MMMM yyyy"
              : view === "week"
                ? "'Week of' MMM d, yyyy"
                : view === "day"
                  ? "EEEE, MMMM d, yyyy"
                  : "MMMM yyyy"
          )}
          onNavigate={(action) => {
            const d = new Date(date)
            if (action === "TODAY") {
              setDate(new Date())
            } else if (action === "PREV") {
              if (view === "month") d.setMonth(d.getMonth() - 1)
              else if (view === "week") d.setDate(d.getDate() - 7)
              else if (view === "day") d.setDate(d.getDate() - 1)
              else d.setMonth(d.getMonth() - 1)
              setDate(d)
            } else {
              if (view === "month") d.setMonth(d.getMonth() + 1)
              else if (view === "week") d.setDate(d.getDate() + 7)
              else if (view === "day") d.setDate(d.getDate() + 1)
              else d.setMonth(d.getMonth() + 1)
              setDate(d)
            }
          }}
          onView={setView}
          onNew={() => {
            setEditingAppointment(null)
            setDefaultDate(undefined)
            setSheetOpen(true)
          }}
        />

        {/* Category legend / filter */}
        <CategoryLegend active={activeCategories} onToggle={toggleCategory} />

        {/* Calendar */}
        {loading ? (
          <Skeleton className="h-[calc(100vh-16rem)] w-full rounded-lg" />
        ) : (
          <div className="h-[calc(100vh-16rem)] min-h-[520px]">
            <Calendar
              localizer={localizer}
              events={events}
              view={view}
              date={date}
              onView={(v) => setView(v as CalendarView)}
              onNavigate={setDate}
              onSelectEvent={handleSelectEvent}
              onSelectSlot={handleSelectSlot}
              selectable
              eventPropGetter={eventPropGetter}
              components={{
                event: EventComponent,
                toolbar: () => null, // hide built-in toolbar (we use our own above)
              }}
              popup
              showMultiDayTimes
              formats={{
                timeGutterFormat: (d: Date) => format(d, "h a"),
                eventTimeRangeFormat: ({ start }: { start: Date }) =>
                  format(start, "h:mm a"),
              }}
            />
          </div>
        )}

        {/* Appointment count */}
        {!loading && (
          <p className="text-xs text-muted-foreground text-right">
            {visibleAppointments.length} appointment
            {visibleAppointments.length !== 1 ? "s" : ""} shown
          </p>
        )}
      </div>

      {workspaceId && (
        <AppointmentSheet
          open={sheetOpen}
          onOpenChange={handleSheetClose}
          workspaceId={workspaceId}
          appointment={editingAppointment}
          defaultDate={defaultDate}
          onSuccess={fetchAppointments}
        />
      )}
    </DashboardShell>
  )
}
