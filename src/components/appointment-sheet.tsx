"use client"

import { FormEvent, useEffect, useState } from "react"

import { format } from "date-fns"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { CATEGORY_OPTIONS } from "@/lib/categories"
import type { AppointmentCategory } from "@/lib/categories"
import type { AppointmentResponse, FamilyMemberResponse, AppointmentStatus } from "@/lib/types"

interface AppointmentSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  workspaceId: string
  appointment?: AppointmentResponse | null
  defaultDate?: string // ISO date string, used when creating from a calendar slot
  onSuccess: () => void
}

const REMINDER_OPTIONS = [
  { label: "15m before", value: 15 },
  { label: "30m before", value: 30 },
  { label: "1h before", value: 60 },
  { label: "2h before", value: 120 },
  { label: "1d before", value: 1440 },
  { label: "2d before", value: 2880 },
]

export function AppointmentSheet({
  open,
  onOpenChange,
  workspaceId,
  appointment,
  defaultDate,
  onSuccess,
}: AppointmentSheetProps) {
  const isEditing = !!appointment

  const [title, setTitle] = useState("")
  const [category, setCategory] = useState<AppointmentCategory>(
    "health_wellness"
  )
  const [subcategory, setSubcategory] = useState("")
  const [status, setStatus] = useState<AppointmentStatus>("upcoming")
  const [memberIds, setMemberIds] = useState<string[]>([])
  const [date, setDate] = useState("")
  const [time, setTime] = useState("")
  const [endDate, setEndDate] = useState("")
  const [endTime, setEndTime] = useState("")
  const [location, setLocation] = useState("")
  const [notes, setNotes] = useState("")
  const [isRecurring, setIsRecurring] = useState(false)
  const [frequency, setFrequency] = useState<
    "weekly" | "monthly" | "yearly"
  >("monthly")
  const [interval, setInterval] = useState(1)
  const [recurrenceEndDate, setRecurrenceEndDate] = useState("")
  const [reminderRules, setReminderRules] = useState<number[]>([])

  const [members, setMembers] = useState<FamilyMemberResponse[]>([])
  const [loading, setLoading] = useState(false)

  // Fetch family members when sheet opens
  useEffect(() => {
    if (!open || !workspaceId) return
    fetch(`/api/family-members`, {
      headers: { "x-workspace-id": workspaceId }
    })
      .then((r) => r.json())
      .then((data) => setMembers(data.members ?? []))
      .catch(() => {})
  }, [open, workspaceId])

  // Populate form when editing
  useEffect(() => {
    if (open && appointment) {
      setTitle(appointment.title)
      setCategory(appointment.category)
      setSubcategory(appointment.subcategory ?? "")
      setStatus(appointment.status ?? "upcoming")
      setMemberIds(appointment.memberIds?.map(m => m._id) ?? (appointment.memberId ? [appointment.memberId._id] : []))
      
      const start = new Date(appointment.startsAt || appointment.date || "")
      setDate(format(start, "yyyy-MM-dd"))
      setTime(format(start, "HH:mm"))

      if (appointment.endsAt) {
        const end = new Date(appointment.endsAt)
        setEndDate(format(end, "yyyy-MM-dd"))
        setEndTime(format(end, "HH:mm"))
      } else {
        setEndDate("")
        setEndTime("")
      }

      setLocation(appointment.location ?? "")
      setNotes(appointment.notes ?? "")
      setIsRecurring(appointment.isRecurring)
      setFrequency(appointment.recurrence?.frequency ?? "monthly")
      setInterval(appointment.recurrence?.interval ?? 1)
      setRecurrenceEndDate(appointment.recurrence?.endDate ? format(new Date(appointment.recurrence.endDate), "yyyy-MM-dd") : "")
      setReminderRules(appointment.reminderRules ?? [])
    } else if (open && !appointment) {
      setTitle("")
      setCategory("health_wellness")
      setSubcategory("")
      setStatus("upcoming")
      setMemberIds([])
      setDate(defaultDate ?? "")
      setTime("")
      setEndDate("")
      setEndTime("")
      setLocation("")
      setNotes("")
      setIsRecurring(false)
      setFrequency("monthly")
      setInterval(1)
      setRecurrenceEndDate("")
      setReminderRules([])
    }
  }, [open, appointment, defaultDate])

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!title.trim() || !date || memberIds.length === 0) return

    setLoading(true)
    try {
      const startsAt = time 
        ? new Date(`${date}T${time}:00`).toISOString()
        : new Date(`${date}T00:00:00`).toISOString()

      let endsAt: string | undefined
      if (endDate) {
        endsAt = endTime 
          ? new Date(`${endDate}T${endTime}:00`).toISOString()
          : new Date(`${endDate}T23:59:59`).toISOString()
      } else if (time && endTime) {
         // Same day, different time
         endsAt = new Date(`${date}T${endTime}:00`).toISOString()
      }

      const body: Record<string, unknown> = {
        title: title.trim(),
        category,
        status,
        memberIds,
        startsAt,
        endsAt,
        location: location.trim() || undefined,
        notes: notes.trim() || undefined,
        subcategory: subcategory.trim() || undefined,
        isRecurring,
        reminderRules,
      }

      if (isRecurring) {
        body.recurrence = { 
          frequency, 
          interval,
          endDate: recurrenceEndDate ? new Date(recurrenceEndDate).toISOString() : undefined
        }
      }

      const url = isEditing
        ? `/api/appointments/${appointment!._id}`
        : "/api/appointments"
      const method = isEditing ? "PUT" : "POST"

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json", "x-workspace-id": workspaceId },
        body: JSON.stringify(body),
      })

      if (!res.ok) throw new Error(await res.text())

      toast.success(isEditing ? "Appointment updated" : "Appointment created")
      onOpenChange(false)
      onSuccess()
    } catch (error) {
      console.error("[AppointmentSheet] Error:", error)
      toast.error("Something went wrong. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  function toggleReminder(val: number) {
    setReminderRules(prev => 
      prev.includes(val) ? prev.filter(v => v !== val) : [...prev, val]
    )
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-xl overflow-y-auto p-5">
        <SheetHeader className="mb-4">
          <SheetTitle>
            {isEditing ? "Edit Appointment" : "New Appointment"}
          </SheetTitle>
        </SheetHeader>

        <form onSubmit={handleSubmit} className="flex flex-col gap-6 pb-8">
          {/* Status */}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="apt-status">Status</Label>
            <Select
              value={status}
              onValueChange={(v) => setStatus(v as AppointmentStatus)}
            >
              <SelectTrigger id="apt-status">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="upcoming">Upcoming</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
                <SelectItem value="rescheduled">Rescheduled</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Title */}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="apt-title">Title</Label>
            <Input
              id="apt-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Annual Pediatrician Visit"
              required
            />
          </div>

          {/* Category & Sub */}
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="apt-category">Category</Label>
              <Select
                value={category}
                onValueChange={(v) => setCategory(v as AppointmentCategory)}
              >
                <SelectTrigger id="apt-category">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORY_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="apt-sub">Subcategory</Label>
              <Input
                id="apt-sub"
                value={subcategory}
                onChange={(e) => setSubcategory(e.target.value)}
                placeholder="Optional"
              />
            </div>
          </div>

          {/* Family Members */}
          <div className="flex flex-col gap-1.5">
            <Label>Family Members</Label>
            <div className="flex flex-wrap gap-x-4 gap-y-2 p-3 border rounded-md min-h-[3rem] max-h-40 overflow-y-auto">
                {members.length === 0 ? (
                  <div className="text-xs text-center w-full text-muted-foreground py-2">
                    No family members found.
                  </div>
                ) : (
                  members.map((m) => (
                    <div key={m._id} className="flex items-center gap-2">
                      <Checkbox
                        id={`member-${m._id}`}
                        checked={memberIds.includes(m._id)}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setMemberIds((prev) => [...prev, m._id]);
                          } else {
                            setMemberIds((prev) =>
                              prev.filter((id) => id !== m._id)
                            );
                          }
                        }}
                      />
                      <Label htmlFor={`member-${m._id}`} className="text-sm font-normal cursor-pointer">
                        {m.name}
                      </Label>
                    </div>
                  ))
                )}
            </div>
          </div>

          {/* Timing Section */}
          <div className="space-y-4 p-4 border rounded-lg bg-muted/20">
             <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Timing</h3>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="apt-date" className="text-xs">Starts At</Label>
                <Input
                  id="apt-date"
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  required
                />
              </div>
              <div className="flex flex-col gap-1.5 pt-6">
                <Input
                  id="apt-time"
                  type="time"
                  value={time}
                  onChange={(e) => setTime(e.target.value)}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="apt-end-date" className="text-xs">Ends At (Optional)</Label>
                <Input
                  id="apt-end-date"
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                />
              </div>
              <div className="flex flex-col gap-1.5 pt-6">
                <Input
                  id="apt-end-time"
                  type="time"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* Location */}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="apt-location">Location</Label>
            <Input
              id="apt-location"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="e.g. Dr. Smith's Office"
            />
          </div>

          {/* Reminders Section */}
          <div className="flex flex-col gap-3 p-4 border rounded-lg">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Reminders</h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {REMINDER_OPTIONS.map((opt) => (
                <div key={opt.value} className="flex items-center gap-2">
                  <Checkbox 
                    id={`rem-${opt.value}`}
                    checked={reminderRules.includes(opt.value)}
                    onCheckedChange={() => toggleReminder(opt.value)}
                  />
                  <Label htmlFor={`rem-${opt.value}`} className="text-xs font-normal cursor-pointer leading-none">
                    {opt.label}
                  </Label>
                </div>
              ))}
            </div>
          </div>

          {/* Recurring Section */}
          <div className="flex flex-col gap-4 p-4 border rounded-lg bg-muted/10">
            <div className="flex items-center gap-2">
              <Checkbox
                id="apt-recurring"
                checked={isRecurring}
                onCheckedChange={(v) => setIsRecurring(!!v)}
              />
              <Label htmlFor="apt-recurring" className="font-semibold cursor-pointer text-sm tracking-tight uppercase text-muted-foreground">
                Recurring Appointment
              </Label>
            </div>
            
            {isRecurring && (
              <div className="grid grid-cols-2 gap-4 animate-in fade-in slide-in-from-top-1">
                <div className="flex flex-col gap-1.5">
                  <Label className="text-xs">Frequency</Label>
                  <Select
                    value={frequency}
                    onValueChange={(v) => setFrequency(v as any)}
                  >
                    <SelectTrigger className="h-9">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="weekly">Weekly</SelectItem>
                      <SelectItem value="monthly">Monthly</SelectItem>
                      <SelectItem value="yearly">Yearly</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label className="text-xs">Interval (Every X)</Label>
                  <Input 
                    type="number"
                    min={1}
                    value={interval}
                    onChange={(e) => setInterval(parseInt(e.target.value) || 1)}
                    className="h-9"
                  />
                </div>
                <div className="flex flex-col gap-1.5 col-span-2">
                  <Label className="text-xs">End Recurrence Date (Optional)</Label>
                  <Input 
                    type="date"
                    value={recurrenceEndDate}
                    onChange={(e) => setRecurrenceEndDate(e.target.value)}
                    className="h-9"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Notes */}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="apt-notes">Notes</Label>
            <textarea
              id="apt-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Any additional details…"
              rows={4}
              className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs outline-none placeholder:text-muted-foreground focus-visible:ring-1 focus-visible:ring-ring resize-none"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t sticky bottom-0 bg-background pb-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={loading || memberIds.length === 0}
              className="min-w-[120px]"
            >
              {loading
                ? "Saving…"
                : isEditing
                  ? "Save Changes"
                  : "Create Appointment"}
            </Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  )
}
