"use client"

import * as React from "react"
import { format } from "date-fns"
import { DashboardShell } from "@/components/dashboard-shell"
import { WellBeingForm } from "@/components/well-being-form"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { PlusIcon } from "lucide-react"
import { useUserId } from "@/hooks/use-user-id"
import type { WellBeingLogResponse } from "@/lib/types"

export default function WellBeingPage() {
  const userId = useUserId()
  const [logs, setLogs] = React.useState<WellBeingLogResponse[]>([])
  const [loading, setLoading] = React.useState(true)
  const [showCheckIn, setShowCheckIn] = React.useState(false)

  const fetchLogs = React.useCallback(async () => {
    if (!userId) return
    setLoading(true)
    try {
      const res = await fetch(`/api/well-being`)
      if (res.ok) {
        const data = await res.json()
        setLogs(data.logs ?? [])
      }
    } catch (error) {
      console.error("Failed to fetch well-being logs:", error)
    } finally {
      setLoading(false)
    }
  }, [userId])

  React.useEffect(() => {
    fetchLogs()
  }, [fetchLogs])

  const hasLoggedToday = React.useMemo(() => {
    if (!logs.length) return false
    const today = new Date().toDateString()
    return logs.some(log => new Date(log.date).toDateString() === today)
  }, [logs])

  // Automatically show the check-in form if they haven't logged today and logs have loaded
  React.useEffect(() => {
    if (!loading && !hasLoggedToday && logs.length >= 0) {
      setShowCheckIn(true)
    }
  }, [loading, hasLoggedToday, logs])

  function handleLogSuccess() {
    setShowCheckIn(false)
    fetchLogs()
  }

  return (
    <DashboardShell title="Well-Being Tracker">
      <div className="flex flex-col gap-6 py-4 px-4 lg:px-6 md:py-6">
        
        {/* Header Actions */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold tracking-tight">Your Trends</h2>
            <p className="text-sm text-muted-foreground pt-1">
              {logs.length} total check-in{logs.length !== 1 ? "s" : ""} recorded.
            </p>
          </div>
          {!showCheckIn && (
            <Button onClick={() => setShowCheckIn(true)}>
               <PlusIcon className="mr-2 size-4" />
               Log Today
            </Button>
          )}
        </div>

        {/* Check-In Form Toggle */}
        <Dialog open={showCheckIn} onOpenChange={setShowCheckIn}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Daily Check-In</DialogTitle>
              <DialogDescription>
                How are you feeling today? Rate your metrics to track your well-being.
              </DialogDescription>
            </DialogHeader>
            <WellBeingForm onSuccess={handleLogSuccess} />
          </DialogContent>
        </Dialog>

        {/* List mapping */}
        {loading ? (
          <div className="space-y-4 mt-4">
             <Skeleton className="h-[120px] w-full rounded-xl" />
             <Skeleton className="h-[120px] w-full rounded-xl" />
          </div>
        ) : logs.length === 0 && !showCheckIn ? (
          <div className="text-center py-20 text-muted-foreground border rounded-xl bg-card/50">
             <p>No well-being data recorded yet.</p>
             <Button className="mt-4" onClick={() => setShowCheckIn(true)}>
               Drop your first record
             </Button>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 mt-4">
            {logs.map((log) => (
              <Card key={log._id} className="flex flex-col">
                <CardHeader className="pb-3 border-b bg-muted/20">
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="text-base">
                        {format(new Date(log.date), "EEEE, MMMM do")}
                      </CardTitle>
                      <CardDescription className="text-xs mt-1">
                        {format(new Date(log.date), "h:mm a")}
                      </CardDescription>
                    </div>
                    {/* Overall Mood indicator dot */}
                    <div className="flex items-center gap-1.5 bg-primary/10 px-2 py-1 rounded-md text-sm font-medium">
                       <span>Mood:</span>
                       <span className="text-primary">{log.metrics.moodScore}/5</span>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-4 flex-1">
                  <div className="grid grid-cols-2 gap-y-3 gap-x-4 text-sm">
                    <MetricItem label="Stress" value={log.metrics.stressLevel} />
                    <MetricItem label="Energy" value={log.metrics.energyLevel} />
                    <MetricItem label="Activity" value={log.metrics.activityLevel} />
                    <MetricItem label="Hydration" value={log.metrics.hydrationScore} />
                  </div>
                  
                  <div className="mt-4 pt-3 border-t flex flex-col gap-1.5">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Sleep:</span>
                      <span className="font-medium">{log.metrics.sleepHours}h ({log.metrics.sleepQuality}/5)</span>
                    </div>
                  </div>

                  {log.tags && log.tags.length > 0 && (
                    <div className="mt-4 flex flex-wrap gap-1.5">
                      {log.tags.map((tag, i) => (
                        <span key={i} className="bg-secondary text-secondary-foreground text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full">
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}

                  {log.notes && (
                    <div className="mt-4 text-sm text-muted-foreground italic border-l-2 pl-3">
                      "{log.notes}"
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}

      </div>
    </DashboardShell>
  )
}

function MetricItem({ label, value }: { label: string; value?: number }) {
   if (value === undefined) return null;
   return (
      <div className="flex justify-between items-center">
         <span className="text-muted-foreground">{label}</span>
         <span className="font-medium">{value}/5</span>
      </div>
   )
}
