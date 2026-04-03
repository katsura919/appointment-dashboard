"use client"

import * as React from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
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
import type { FamilyMemberResponse, MemberRole } from "@/lib/types"

interface FamilyMemberSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  userId: string
  member?: FamilyMemberResponse | null
  onSuccess: () => void
}

const ROLE_LABELS: Record<MemberRole, string> = {
  mom: "Mom",
  dad: "Dad",
  child: "Child",
  other: "Other",
}

export function FamilyMemberSheet({
  open,
  onOpenChange,
  userId,
  member,
  onSuccess,
}: FamilyMemberSheetProps) {
  const isEditing = !!member

  const [name, setName] = React.useState("")
  const [role, setRole] = React.useState<MemberRole>("child")
  const [dateOfBirth, setDateOfBirth] = React.useState("")
  const [loading, setLoading] = React.useState(false)

  // Populate form when editing
  React.useEffect(() => {
    if (open && member) {
      setName(member.name)
      setRole(member.role)
      setDateOfBirth(
        member.dateOfBirth
          ? new Date(member.dateOfBirth).toISOString().split("T")[0]
          : ""
      )
    } else if (open && !member) {
      setName("")
      setRole("child")
      setDateOfBirth("")
    }
  }, [open, member])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim() || !role) return

    setLoading(true)
    try {
      const body: Record<string, unknown> = { userId, name: name.trim(), role }
      if (dateOfBirth) body.dateOfBirth = new Date(dateOfBirth).toISOString()

      const url = isEditing
        ? `/api/family-members/${member!._id}`
        : "/api/family-members"
      const method = isEditing ? "PUT" : "POST"

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })

      if (!res.ok) throw new Error(await res.text())

      toast.success(isEditing ? "Member updated" : "Member added")
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
      <SheetContent side="right" className="w-full sm:max-w-md overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{isEditing ? "Edit Member" : "Add Family Member"}</SheetTitle>
        </SheetHeader>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4 px-4 py-2">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="fm-name">Name</Label>
            <Input
              id="fm-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Sarah"
              required
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="fm-role">Role</Label>
            <Select value={role} onValueChange={(v) => setRole(v as MemberRole)}>
              <SelectTrigger id="fm-role">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(Object.keys(ROLE_LABELS) as MemberRole[]).map((r) => (
                  <SelectItem key={r} value={r}>
                    {ROLE_LABELS[r]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="fm-dob">Date of Birth (optional)</Label>
            <Input
              id="fm-dob"
              type="date"
              value={dateOfBirth}
              onChange={(e) => setDateOfBirth(e.target.value)}
            />
          </div>

          <SheetFooter className="px-0 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Saving…" : isEditing ? "Save Changes" : "Add Member"}
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  )
}
