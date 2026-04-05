"use client"

import { useCallback, useEffect, useMemo, useState } from "react"

import { format, subDays, startOfDay } from "date-fns"
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts"
import {
  Flame,
  Smile,
  Moon,
  ClipboardList,
  PlusIcon,
  Pencil,
  Trash2,
} from "lucide-react"
import { toast } from "sonner"
import { DashboardShell } from "@/components/dashboard-shell"
import { WellBeingForm } from "@/components/well-being-form"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { useWorkspace } from "@/contexts/workspace-context"
import type { WellBeingLogResponse } from "@/lib/types"

// ─── Types ─────────────────────────────────────────────────────────────────
type TimeRange = "7d" | "30d" | "90d" | "all"

// ─── Metric config ──────────────────────────────────────────────────────────
const METRICS = [
  { key: "moodScore",      label: "Mood",          color: "#6366f1", inverted: false },
  { key: "stressLevel",    label: "Stress",         color: "#ef4444", inverted: true  },
  { key: "energyLevel",    label: "Energy",         color: "#f59e0b", inverted: false },
  { key: "activityLevel",  label: "Activity",       color: "#10b981", inverted: false },
  { key: "hydrationScore", label: "Hydration",      color: "#06b6d4", inverted: false },
  { key: "sleepQuality",   label: "Sleep Quality",  color: "#8b5cf6", inverted: false },
] as const

type MetricKey = typeof METRICS[number]["key"]

// ─── Helpers ────────────────────────────────────────────────────────────────
function avg(values: number[]): number {
  if (!values.length) return 0
  return values.reduce((s, v) => s + v, 0) / values.length
}

function calcStreak(logs: WellBeingLogResponse[]): number {
  if (!logs.length) return 0
  const dateStrings = new Set(logs.map((l) => startOfDay(new Date(l.date)).toDateString()))
  let streak = 0
  const cursor = startOfDay(new Date())
  while (dateStrings.has(cursor.toDateString())) {
    streak++
    cursor.setDate(cursor.getDate() - 1)
  }
  return streak
}

function filterByRange(logs: WellBeingLogResponse[], range: TimeRange): WellBeingLogResponse[] {
  if (range === "all") return logs
  const days = range === "7d" ? 7 : range === "30d" ? 30 : 90
  const cutoff = subDays(new Date(), days)
  return logs.filter((l) => new Date(l.date) >= cutoff)
}

// ─── Score bar ──────────────────────────────────────────────────────────────
function ScoreBar({ value, inverted = false }: { value: number; inverted?: boolean }) {
  const pct = ((value - 1) / 4) * 100
  const effectivePct = inverted ? 100 - pct : pct

  const color =
    effectivePct >= 75 ? "bg-emerald-500" :
    effectivePct >= 50 ? "bg-lime-500" :
    effectivePct >= 25 ? "bg-orange-400" :
    "bg-red-500"

  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
        <div className={`h-full rounded-full transition-all ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs font-medium tabular-nums text-muted-foreground w-4">{value}</span>
    </div>
  )
}

// ─── Stat card ──────────────────────────────────────────────────────────────
function StatCard({
  title,
  value,
  sub,
  icon: Icon,
}: {
  title: string
  value: string | number
  sub: string
  icon: React.ElementType
}) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardDescription className="flex items-center gap-1.5">
          <Icon className="size-3.5" />
          {title}
        </CardDescription>
        <CardTitle className="text-2xl tabular-nums">{value}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-xs text-muted-foreground">{sub}</p>
      </CardContent>
    </Card>
  )
}

// ─── Page ────────────────────────────────────────────────────────────────────
export default function WellBeingPage() {
  const { activeWorkspace } = useWorkspace()
  const workspaceId = activeWorkspace?._id ?? null
  const timezone = activeWorkspace?.timezone ?? "UTC"

  const [logs, setLogs] = useState<WellBeingLogResponse[]>([])
  const [loading, setLoading] = useState(true)
  const [range, setRange] = useState<TimeRange>("30d")
  const [activeMetrics, setActiveMetrics] = useState<Set<MetricKey>>(
    new Set(METRICS.map((m) => m.key))
  )

  // Sheet state
  const [sheetOpen, setSheetOpen] = useState(false)
  const [editingLog, setEditingLog] = useState<WellBeingLogResponse | null>(null)

  // Delete confirm
  const [deleteTarget, setDeleteTarget] = useState<WellBeingLogResponse | null>(null)

  // ── Fetch ────────────────────────────────────────────────────────────────
  const fetchLogs = useCallback(async () => {
    if (!workspaceId) return
    setLoading(true)
    try {
      const res = await fetch("/api/well-being", {
        headers: { "x-workspace-id": workspaceId },
      })
      if (res.ok) {
        const data = await res.json()
        setLogs(data.logs ?? [])
      }
    } catch {
      toast.error("Failed to load well-being logs.")
    } finally {
      setLoading(false)
    }
  }, [workspaceId])

  useEffect(() => { fetchLogs() }, [fetchLogs])

  // Auto-open form if no entry today
  useEffect(() => {
    if (loading || !logs.length === undefined) return
    const today = startOfDay(new Date()).toDateString()
    const loggedToday = logs.some((l) => startOfDay(new Date(l.date)).toDateString() === today)
    if (!loading && !loggedToday) {
      setEditingLog(null)
      setSheetOpen(true)
    }
  }, [loading, logs])

  // ── Derived data ─────────────────────────────────────────────────────────
  const filtered = useMemo(() => filterByRange(logs, range), [logs, range])

  const stats = useMemo(() => {
    const last7 = filterByRange(logs, "7d")
    return {
      streak: calcStreak(logs),
      avgMood: avg(last7.map((l) => l.metrics.moodScore).filter((v): v is number => v !== undefined)),
      avgSleep: avg(last7.map((l) => l.metrics.sleepHours).filter((v): v is number => v !== undefined)),
      total: logs.length,
    }
  }, [logs])

  const chartData = useMemo(() =>
    [...filtered].reverse().map((l) => ({
      date: format(new Date(l.date), "MMM d"),
      moodScore: l.metrics.moodScore,
      stressLevel: l.metrics.stressLevel,
      energyLevel: l.metrics.energyLevel,
      activityLevel: l.metrics.activityLevel,
      hydrationScore: l.metrics.hydrationScore,
      sleepQuality: l.metrics.sleepQuality,
    }))
  , [filtered])

  const topTags = useMemo(() => {
    const counts: Record<string, number> = {}
    logs.forEach((l) => l.tags?.forEach((t) => { counts[t] = (counts[t] ?? 0) + 1 }))
    return Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 12)
  }, [logs])

  // ── Handlers ─────────────────────────────────────────────────────────────
  function toggleMetric(key: MetricKey) {
    setActiveMetrics((prev) => {
      const next = new Set(prev)
      next.has(key) ? next.delete(key) : next.add(key)
      return next
    })
  }

  function openNew() {
    setEditingLog(null)
    setSheetOpen(true)
  }

  function openEdit(log: WellBeingLogResponse) {
    setEditingLog(log)
    setSheetOpen(true)
  }

  async function handleDelete(log: WellBeingLogResponse) {
    try {
      const res = await fetch(`/api/well-being/${log._id}`, {
        method: "DELETE",
        headers: { "x-workspace-id": workspaceId ?? "" },
      })
      if (!res.ok) throw new Error()
      toast.success("Log deleted.")
      setDeleteTarget(null)
      fetchLogs()
    } catch {
      toast.error("Failed to delete log.")
    }
  }

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <DashboardShell title="Well-Being Tracker">
      <div className="flex flex-col gap-6 py-4 px-4 lg:px-6 md:py-6">

        {/* ── Header ─────────────────────────────────────────────────────── */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold tracking-tight">Well-Being</h2>
            <p className="text-sm text-muted-foreground mt-0.5">
              {logs.length} check-in{logs.length !== 1 ? "s" : ""} recorded
            </p>
          </div>
          <Button onClick={openNew}>
            <PlusIcon className="size-4 mr-2" />
            Log Today
          </Button>
        </div>

        {loading ? (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
              {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-28 rounded-xl" />)}
            </div>
            <Skeleton className="h-64 rounded-xl" />
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-48 rounded-xl" />)}
            </div>
          </div>
        ) : logs.length === 0 ? (
          <div className="text-center py-24 text-muted-foreground border rounded-xl bg-card/50">
            <p className="font-medium">No well-being data yet.</p>
            <p className="text-sm mt-1">Start tracking how you feel each day.</p>
            <Button className="mt-4" onClick={openNew}>Log your first entry</Button>
          </div>
        ) : (
          <>
            {/* ── Stats ──────────────────────────────────────────────────── */}
            <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
              <StatCard
                title="Logging Streak"
                value={`${stats.streak}d`}
                sub="consecutive days"
                icon={Flame}
              />
              <StatCard
                title="Avg Mood (7d)"
                value={stats.avgMood ? stats.avgMood.toFixed(1) : "—"}
                sub="out of 5"
                icon={Smile}
              />
              <StatCard
                title="Avg Sleep (7d)"
                value={stats.avgSleep ? `${stats.avgSleep.toFixed(1)}h` : "—"}
                sub="hours per night"
                icon={Moon}
              />
              <StatCard
                title="Total Logs"
                value={stats.total}
                sub="all-time entries"
                icon={ClipboardList}
              />
            </div>

            {/* ── Chart ──────────────────────────────────────────────────── */}
            <Card>
              <CardHeader className="pb-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <CardTitle className="text-base">Trends</CardTitle>
                    <CardDescription className="text-xs mt-0.5">
                      1–5 scale · stress is inverted (lower = better)
                    </CardDescription>
                  </div>
                  {/* Time range pills */}
                  <div className="flex gap-1 shrink-0">
                    {(["7d", "30d", "90d", "all"] as TimeRange[]).map((r) => (
                      <button
                        key={r}
                        onClick={() => setRange(r)}
                        className={`px-3 py-1 rounded-full text-xs font-medium transition-colors
                          ${range === r
                            ? "bg-primary text-primary-foreground"
                            : "bg-muted text-muted-foreground hover:bg-accent"}`}
                      >
                        {r === "all" ? "All" : r}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Metric toggles */}
                <div className="flex flex-wrap gap-2 mt-2">
                  {METRICS.map((m) => (
                    <button
                      key={m.key}
                      type="button"
                      onClick={() => toggleMetric(m.key)}
                      className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs font-medium transition-all ${
                        activeMetrics.has(m.key)
                          ? "border-transparent text-white"
                          : "border-border bg-background text-muted-foreground opacity-50"
                      }`}
                      style={activeMetrics.has(m.key) ? { backgroundColor: m.color, borderColor: m.color } : {}}
                    >
                      <span className="size-1.5 rounded-full bg-current" />
                      {m.label}
                    </button>
                  ))}
                </div>
              </CardHeader>
              <CardContent>
                {chartData.length < 2 ? (
                  <div className="h-48 flex items-center justify-center text-sm text-muted-foreground">
                    Log at least 2 entries in this range to see trends.
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height={260}>
                    <LineChart data={chartData} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                      <XAxis
                        dataKey="date"
                        tick={{ fontSize: 11 }}
                        tickLine={false}
                        axisLine={false}
                        interval="preserveStartEnd"
                      />
                      <YAxis
                        domain={[1, 5]}
                        ticks={[1, 2, 3, 4, 5]}
                        tick={{ fontSize: 11 }}
                        tickLine={false}
                        axisLine={false}
                      />
                      <Tooltip
                        contentStyle={{
                          fontSize: 12,
                          borderRadius: 8,
                          border: "1px solid hsl(var(--border))",
                          background: "hsl(var(--background))",
                          color: "hsl(var(--foreground))",
                        }}
                      />
                      <Legend wrapperStyle={{ fontSize: 12, paddingTop: 8 }} />
                      {METRICS.filter((m) => activeMetrics.has(m.key)).map((m) => (
                        <Line
                          key={m.key}
                          type="monotone"
                          dataKey={m.key}
                          name={m.label}
                          stroke={m.color}
                          strokeWidth={2}
                          dot={{ r: 3, strokeWidth: 0, fill: m.color }}
                          activeDot={{ r: 5 }}
                          connectNulls
                        />
                      ))}
                    </LineChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            {/* ── Top Tags ───────────────────────────────────────────────── */}
            {topTags.length > 0 && (
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mr-1">
                  Top Tags
                </span>
                {topTags.map(([tag, count]) => (
                  <Badge key={tag} variant="secondary" className="gap-1 text-xs">
                    {tag}
                    <span className="text-muted-foreground font-normal">{count}</span>
                  </Badge>
                ))}
              </div>
            )}

            {/* ── Log Grid ───────────────────────────────────────────────── */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-widest">
                  Entries
                </h3>
                <span className="text-xs text-muted-foreground">{filtered.length} shown</span>
              </div>
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {filtered.map((log) => (
                  <LogCard
                    key={log._id}
                    log={log}
                    onEdit={() => openEdit(log)}
                    onDelete={() => setDeleteTarget(log)}
                  />
                ))}
              </div>
            </div>
          </>
        )}
      </div>

      {/* ── Log Sheet ──────────────────────────────────────────────────────── */}
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent className="w-full sm:max-w-md overflow-y-auto">
          <SheetHeader className="mb-6">
            <SheetTitle>{editingLog ? "Edit Log" : "Daily Check-In"}</SheetTitle>
            <SheetDescription>
              {editingLog
                ? `Editing entry for ${format(new Date(editingLog.date), "MMMM d, yyyy")}`
                : "How are you feeling today?"}
            </SheetDescription>
          </SheetHeader>
          <div className="px-4 pb-6">
            <WellBeingForm
              workspaceId={workspaceId ?? ""}
              timezone={timezone}
              log={editingLog ?? undefined}
              onSuccess={() => { setSheetOpen(false); fetchLogs() }}
              onCancel={() => setSheetOpen(false)}
            />
          </div>
        </SheetContent>
      </Sheet>

      {/* ── Delete confirm ─────────────────────────────────────────────────── */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(v) => !v && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this log?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteTarget && `Entry from ${format(new Date(deleteTarget.date), "MMMM d, yyyy")} will be permanently removed.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-white hover:bg-destructive/90"
              onClick={() => deleteTarget && handleDelete(deleteTarget)}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DashboardShell>
  )
}

// ─── Log Card ─────────────────────────────────────────────────────────────────
function LogCard({
  log,
  onEdit,
  onDelete,
}: {
  log: WellBeingLogResponse
  onEdit: () => void
  onDelete: () => void
}) {
  const m = log.metrics
  const moodPct = m.moodScore ? ((m.moodScore - 1) / 4) * 100 : 0
  const moodColor =
    moodPct >= 75 ? "text-emerald-600 bg-emerald-50 border-emerald-200" :
    moodPct >= 50 ? "text-lime-700 bg-lime-50 border-lime-200" :
    moodPct >= 25 ? "text-orange-600 bg-orange-50 border-orange-200" :
    "text-red-600 bg-red-50 border-red-200"

  return (
    <Card className="flex flex-col">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <div>
            <CardTitle className="text-sm font-semibold">
              {format(new Date(log.date), "EEEE, MMM d")}
            </CardTitle>
            <CardDescription className="text-xs mt-0.5">
              {format(new Date(log.date), "yyyy")}
            </CardDescription>
          </div>
          <div className="flex items-center gap-1">
            {m.moodScore !== undefined && (
              <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${moodColor}`}>
                Mood {m.moodScore}/5
              </span>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-0 flex-1 flex flex-col gap-3">
        {/* Metrics */}
        <div className="space-y-2">
          {m.stressLevel !== undefined && (
            <MetricRow label="Stress" value={m.stressLevel} inverted />
          )}
          {m.energyLevel !== undefined && (
            <MetricRow label="Energy" value={m.energyLevel} />
          )}
          {m.activityLevel !== undefined && (
            <MetricRow label="Activity" value={m.activityLevel} />
          )}
          {m.hydrationScore !== undefined && (
            <MetricRow label="Hydration" value={m.hydrationScore} />
          )}
        </div>

        {/* Sleep */}
        {(m.sleepHours !== undefined || m.sleepQuality !== undefined) && (
          <div className="flex items-center justify-between text-xs border-t pt-3">
            <span className="text-muted-foreground">Sleep</span>
            <span className="font-medium tabular-nums">
              {m.sleepHours !== undefined && `${m.sleepHours}h`}
              {m.sleepHours !== undefined && m.sleepQuality !== undefined && " · "}
              {m.sleepQuality !== undefined && `${m.sleepQuality}/5 quality`}
            </span>
          </div>
        )}

        {/* Tags */}
        {log.tags && log.tags.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {log.tags.map((tag, i) => (
              <span
                key={i}
                className="bg-secondary text-secondary-foreground text-[10px] uppercase font-semibold tracking-wider px-2 py-0.5 rounded-full"
              >
                {tag}
              </span>
            ))}
          </div>
        )}

        {/* Notes */}
        {log.notes && (
          <p className="text-xs text-muted-foreground italic border-l-2 pl-2.5 line-clamp-2">
            "{log.notes}"
          </p>
        )}

        {/* Actions */}
        <div className="flex gap-2 pt-1 mt-auto">
          <Button variant="outline" size="sm" className="flex-1 h-7 text-xs" onClick={onEdit}>
            <Pencil className="size-3 mr-1" />
            Edit
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-muted-foreground hover:text-destructive"
            onClick={onDelete}
          >
            <Trash2 className="size-3" />
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

function MetricRow({ label, value, inverted = false }: { label: string; value: number; inverted?: boolean }) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-muted-foreground w-16 shrink-0">{label}</span>
      <ScoreBar value={value} inverted={inverted} />
    </div>
  )
}
