"use client"

import * as React from "react"
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
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { CATEGORY_OPTIONS } from "@/lib/categories"
import type { AppointmentCategory } from "@/lib/categories"
import type { AppointmentResponse, FamilyMemberResponse } from "@/lib/types"

interface AppointmentSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  userId: string
  appointment?: AppointmentResponse | null
  defaultDate?: string // ISO date string, used when creating from a calendar slot
  onSuccess: () => void
}

export function AppointmentSheet({
  open,
  onOpenChange,
  userId,
  appointment,
  defaultDate,
  onSuccess,
}: AppointmentSheetProps) {
  const isEditing = !!appointment

  const [title, setTitle] = React.useState("")
  const [category, setCategory] = React.useState<AppointmentCategory>(
    "health_wellness"
  )
  const [subcategory, setSubcategory] = React.useState("")
  const [memberIds, setMemberIds] = React.useState<string[]>([])
  const [date, setDate] = React.useState("")
  const [time, setTime] = React.useState("")
  const [location, setLocation] = React.useState("")
  const [notes, setNotes] = React.useState("")
  const [isRecurring, setIsRecurring] = React.useState(false)
  const [frequency, setFrequency] = React.useState<
    "weekly" | "monthly" | "yearly"
  >("monthly")

  const [members, setMembers] = React.useState<FamilyMemberResponse[]>([])
  const [loading, setLoading] = React.useState(false)

  // Fetch family members when sheet opens
  React.useEffect(() => {
    if (!open || !userId) return
    fetch(`/api/family-members?userId=${userId}`)
      .then((r) => r.json())
      .then((data) => setMembers(data.members ?? []))
      .catch(() => {})
  }, [open, userId])

  // Populate form when editing
  React.useEffect(() => {
    if (open && appointment) {
      setTitle(appointment.title)
      setCategory(appointment.category)
      setSubcategory(appointment.subcategory ?? "")
      setMemberIds(appointment.memberIds?.map(m => m._id) ?? (appointment.memberId ? [appointment.memberId._id] : []))
      const aptDate = new Date(appointment.startsAt || appointment.date || "")
      setDate(format(aptDate, "yyyy-MM-dd"))
      setTime(format(aptDate, "HH:mm"))
      setLocation(appointment.location ?? "")
      setNotes(appointment.notes ?? "")
      setIsRecurring(appointment.isRecurring)
      setFrequency(appointment.recurrence?.frequency ?? "monthly")
    } else if (open && !appointment) {
      setTitle("")
      setCategory("health_wellness")
      setSubcategory("")
      setMemberIds([])
      setDate(defaultDate ?? "")
      setTime("")
      setLocation("")
      setNotes("")
      setIsRecurring(false)
      setFrequency("monthly")
    }
  }, [open, appointment])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!title.trim() || !date || memberIds.length === 0) return

    setLoading(true)
    try {
      let startsAt: string;
      if (time) {
        startsAt = new Date(`${date}T${time}:00`).toISOString();
      } else {
        startsAt = new Date(`${date}T00:00:00`).toISOString();
      }

      const body: Record<string, unknown> = {
        title: title.trim(),
        category,
        memberIds,
        startsAt,
        isRecurring,
      }
      if (subcategory.trim()) body.subcategory = subcategory.trim()
      if (location.trim()) body.location = location.trim()
      if (notes.trim()) body.notes = notes.trim()
      if (isRecurring) body.recurrence = { frequency }

      const url = isEditing
        ? `/api/appointments/${appointment!._id}`
        : "/api/appointments"
      const method = isEditing ? "PUT" : "POST"

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })

      if (!res.ok) throw new Error(await res.text())

      toast.success(isEditing ? "Appointment updated" : "Appointment created")
      onOpenChange(false)
      onSuccess()
    } catch {
      toast.error("Something went wrong. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle>
            {isEditing ? "Edit Appointment" : "New Appointment"}
          </SheetTitle>
        </SheetHeader>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4 px-4 py-2">
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

          {/* Category */}
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

          {/* Subcategory */}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="apt-sub">Subcategory (optional)</Label>
            <Input
              id="apt-sub"
              value={subcategory}
              onChange={(e) => setSubcategory(e.target.value)}
              placeholder="e.g. Dental cleaning"
            />
          </div>

          {/* Family Members */}
          <div className="flex flex-col gap-1.5">
            <Label>Family Members</Label>
            <div className="flex flex-col gap-3 p-3 border rounded-md max-h-40 overflow-y-auto">
                {members.length === 0 ? (
                  <div className="text-sm text-center text-muted-foreground">
                    No family members yet. Add one first.
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
                      <Label htmlFor={`member-${m._id}`} className="font-normal cursor-pointer">
                        {m.name} ({m.role})
                      </Label>
                    </div>
                  ))
                )}
            </div>
          </div>

          {/* Date + Time */}
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="apt-date">Date</Label>
              <Input
                id="apt-date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="apt-time">Time (optional)</Label>
              <Input
                id="apt-time"
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
              />
            </div>
          </div>

          {/* Location */}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="apt-location">Location (optional)</Label>
            <Input
              id="apt-location"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="e.g. Dr. Smith's Office"
            />
          </div>

          {/* Notes */}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="apt-notes">Notes (optional)</Label>
            <textarea
              id="apt-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Any additional details…"
              rows={3}
              className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs outline-none placeholder:text-muted-foreground focus-visible:ring-1 focus-visible:ring-ring resize-none"
            />
          </div>

          {/* Recurring */}
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <Checkbox
                id="apt-recurring"
                checked={isRecurring}
                onCheckedChange={(v) => setIsRecurring(!!v)}
              />
              <Label htmlFor="apt-recurring" className="cursor-pointer">
                Recurring appointment
              </Label>
            </div>
            {isRecurring && (
              <Select
                value={frequency}
                onValueChange={(v) =>
                  setFrequency(v as "weekly" | "monthly" | "yearly")
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="weekly">Weekly</SelectItem>
                  <SelectItem value="monthly">Monthly</SelectItem>
                  <SelectItem value="yearly">Yearly</SelectItem>
                </SelectContent>
              </Select>
            )}
          </div>

          <SheetFooter className="px-0 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading || memberIds.length === 0}>
              {loading
                ? "Saving…"
                : isEditing
                  ? "Save Changes"
                  : "Create Appointment"}
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  )
}
