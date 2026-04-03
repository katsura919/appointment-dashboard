"use client"

import * as React from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { PlusIcon, FilterIcon } from "lucide-react"
import { DashboardShell } from "@/components/dashboard-shell"
import { AppointmentCard } from "@/components/appointment-card"
import { AppointmentSheet } from "@/components/appointment-sheet"
import { CategoryBadge } from "@/components/category-badge"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { CATEGORY_OPTIONS, type AppointmentCategory } from "@/lib/categories"
import { useUserId } from "@/hooks/use-user-id"
import type { AppointmentResponse, AppointmentStatus, FamilyMemberResponse } from "@/lib/types"

const STATUS_OPTIONS: { value: string; label: string }[] = [
  { value: "all", label: "All statuses" },
  { value: "upcoming", label: "Upcoming" },
  { value: "completed", label: "Completed" },
  { value: "cancelled", label: "Cancelled" },
  { value: "rescheduled", label: "Rescheduled" },
]

export default function AppointmentsPage() {
  const userId = useUserId()
  const searchParams = useSearchParams()
  const router = useRouter()

  const categoryParam = searchParams.get("category") as AppointmentCategory | null
  const openNew = searchParams.get("new") === "1"

  const [appointments, setAppointments] = React.useState<AppointmentResponse[]>([])
  const [members, setMembers] = React.useState<FamilyMemberResponse[]>([])
  const [loading, setLoading] = React.useState(true)
  const [sheetOpen, setSheetOpen] = React.useState(openNew)
  const [editingAppointment, setEditingAppointment] =
    React.useState<AppointmentResponse | null>(null)

  const [filterCategory, setFilterCategory] = React.useState<string>(
    categoryParam ?? "all"
  )
  const [filterMember, setFilterMember] = React.useState("all")
  const [filterStatus, setFilterStatus] = React.useState("upcoming")

  // Sync category filter when URL changes
  React.useEffect(() => {
    if (categoryParam) setFilterCategory(categoryParam)
  }, [categoryParam])

  const fetchAppointments = React.useCallback(async () => {
    if (!userId) return
    setLoading(true)
    try {
      const params = new URLSearchParams({ userId })
      if (filterCategory !== "all") params.set("category", filterCategory)
      if (filterMember !== "all") params.set("memberId", filterMember)
      if (filterStatus !== "all") params.set("status", filterStatus)

      const res = await fetch(`/api/appointments?${params}`)
      const data = await res.json()
      setAppointments(data.appointments ?? [])
    } catch {
      // silently fail
    } finally {
      setLoading(false)
    }
  }, [userId, filterCategory, filterMember, filterStatus])

  React.useEffect(() => {
    fetchAppointments()
  }, [fetchAppointments])

  React.useEffect(() => {
    if (!userId) return
    fetch(`/api/family-members?userId=${userId}`)
      .then((r) => r.json())
      .then((d) => setMembers(d.members ?? []))
      .catch(() => {})
  }, [userId])

  async function handleStatusChange(id: string, status: AppointmentStatus) {
    await fetch(`/api/appointments/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    })
    fetchAppointments()
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this appointment?")) return
    await fetch(`/api/appointments/${id}`, { method: "DELETE" })
    fetchAppointments()
  }

  function handleEdit(a: AppointmentResponse) {
    setEditingAppointment(a)
    setSheetOpen(true)
  }

  function handleSheetClose(open: boolean) {
    setSheetOpen(open)
    if (!open) {
      setEditingAppointment(null)
      // clear ?new=1 from URL without re-rendering
      if (openNew) router.replace("/appointments")
    }
  }

  return (
    <DashboardShell title="Appointments">
      <div className="flex flex-col gap-6 py-4 md:gap-6 md:py-6">
        {/* Toolbar */}
        <div className="flex flex-col gap-3 px-4 lg:px-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2 flex-wrap">
            <FilterIcon className="size-4 text-muted-foreground shrink-0" />

            {/* Category filter */}
            <Select value={filterCategory} onValueChange={setFilterCategory}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="All categories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All categories</SelectItem>
                {CATEGORY_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Member filter */}
            <Select value={filterMember} onValueChange={setFilterMember}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="All members" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All members</SelectItem>
                {members.map((m) => (
                  <SelectItem key={m._id} value={m._id}>
                    {m.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Status filter */}
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-[150px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {STATUS_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Button
            onClick={() => {
              setEditingAppointment(null)
              setSheetOpen(true)
            }}
          >
            <PlusIcon className="size-4" />
            New Appointment
          </Button>
        </div>

        {/* Active category label */}
        {filterCategory !== "all" && (
          <div className="px-4 lg:px-6">
            <CategoryBadge
              category={filterCategory as AppointmentCategory}
              className="text-sm px-3 py-1"
            />
          </div>
        )}

        {/* List */}
        {loading ? (
          <div className="grid gap-3 px-4 lg:px-6 sm:grid-cols-2 xl:grid-cols-3">
            {[...Array(6)].map((_, i) => (
              <Skeleton key={i} className="h-32 rounded-xl" />
            ))}
          </div>
        ) : appointments.length === 0 ? (
          <div className="px-4 lg:px-6 py-12 text-center text-muted-foreground text-sm">
            No appointments found. Add one to get started.
          </div>
        ) : (
          <div className="grid gap-3 px-4 lg:px-6 sm:grid-cols-2 xl:grid-cols-3">
            {appointments.map((a) => (
              <AppointmentCard
                key={a._id}
                appointment={a}
                onStatusChange={handleStatusChange}
                onEdit={handleEdit}
                onDelete={handleDelete}
              />
            ))}
          </div>
        )}
      </div>

      {userId && (
        <AppointmentSheet
          open={sheetOpen}
          onOpenChange={handleSheetClose}
          userId={userId}
          appointment={editingAppointment}
          onSuccess={fetchAppointments}
        />
      )}
    </DashboardShell>
  )
}
