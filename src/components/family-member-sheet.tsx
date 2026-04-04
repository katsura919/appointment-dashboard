"use client"

import { FormEvent, useEffect, useState } from "react"

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
  workspaceId: string
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
  workspaceId,
  member,
  onSuccess,
}: FamilyMemberSheetProps) {
  const isEditing = !!member

  const [name, setName] = useState("")
  const [role, setRole] = useState<MemberRole>("child")
  const [dateOfBirth, setDateOfBirth] = useState("")
  const [contactNumber, setContactNumber] = useState("")
  const [email, setEmail] = useState("")
  const [loading, setLoading] = useState(false)

  // Populate form when editing
  useEffect(() => {
    if (open && member) {
      setName(member.name)
      setRole(member.role)
      setDateOfBirth(
        member.dateOfBirth
          ? new Date(member.dateOfBirth).toISOString().split("T")[0]
          : ""
      )
      setContactNumber(member.contactNumber ?? "")
      setEmail(member.email ?? "")
    } else if (open && !member) {
      setName("")
      setRole("child")
      setDateOfBirth("")
      setContactNumber("")
      setEmail("")
    }
  }, [open, member])

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!name.trim() || !role) return

    setLoading(true)
    try {
      const body: Record<string, unknown> = {
        name: name.trim(),
        role,
        contactNumber: contactNumber.trim(),
        email: email.trim().toLowerCase(),
      }
      if (dateOfBirth) body.dateOfBirth = new Date(dateOfBirth).toISOString()

      const url = isEditing
        ? `/api/family-members/${member!._id}`
        : "/api/family-members"
      const method = isEditing ? "PUT" : "POST"

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json", "x-workspace-id": workspaceId },
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
          
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="fm-phone">Contact Number (optional)</Label>
            <Input
              id="fm-phone"
              type="tel"
              value={contactNumber}
              onChange={(e) => setContactNumber(e.target.value)}
              placeholder="e.g. +1 234 567 890"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="fm-email">Email Address (optional)</Label>
            <Input
              id="fm-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="e.g. sarah@example.com"
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
