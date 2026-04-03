"use client"

import * as React from "react"
import { UserIcon, PlusIcon, PencilIcon, Trash2Icon, CalendarIcon } from "lucide-react"
import { DashboardShell } from "@/components/dashboard-shell"
import { FamilyMemberSheet } from "@/components/family-member-sheet"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { useUserId } from "@/hooks/use-user-id"
import type { FamilyMemberResponse, MemberRole } from "@/lib/types"

const ROLE_COLORS: Record<MemberRole, string> = {
  mom: "bg-teal-100 text-teal-700",
  dad: "bg-blue-100 text-blue-700",
  child: "bg-purple-100 text-purple-700",
  other: "bg-slate-100 text-slate-700",
}

const ROLE_LABELS: Record<MemberRole, string> = {
  mom: "Mom",
  dad: "Dad",
  child: "Child",
  other: "Other",
}

function MemberCard({
  member,
  onEdit,
  onDelete,
}: {
  member: FamilyMemberResponse
  onEdit: (m: FamilyMemberResponse) => void
  onDelete: (id: string) => void
}) {
  const roleColor = ROLE_COLORS[member.role] ?? "bg-slate-100 text-slate-700"

  return (
    <Card className="group">
      <CardHeader className="flex flex-row items-start justify-between gap-2 pb-3">
        <div className="flex items-center gap-3">
          <div className="size-10 rounded-full bg-muted flex items-center justify-center text-lg font-semibold shrink-0">
            {member.avatar ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={member.avatar}
                alt={member.name}
                className="size-10 rounded-full object-cover"
              />
            ) : (
              member.name.charAt(0).toUpperCase()
            )}
          </div>
          <div>
            <p className="font-medium leading-tight">{member.name}</p>
            <span
              className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium mt-0.5 ${roleColor}`}
            >
              {ROLE_LABELS[member.role]}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <Button
            variant="ghost"
            size="icon"
            className="size-7"
            onClick={() => onEdit(member)}
          >
            <PencilIcon className="size-3.5" />
            <span className="sr-only">Edit</span>
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="size-7 text-destructive hover:text-destructive"
            onClick={() => onDelete(member._id)}
          >
            <Trash2Icon className="size-3.5" />
            <span className="sr-only">Delete</span>
          </Button>
        </div>
      </CardHeader>
      {member.dateOfBirth && (
        <CardContent className="pt-0 text-sm text-muted-foreground flex items-center gap-1.5">
          <CalendarIcon className="size-3.5" />
          Born{" "}
          {new Date(member.dateOfBirth).toLocaleDateString("en-US", {
            month: "long",
            day: "numeric",
            year: "numeric",
          })}
        </CardContent>
      )}
    </Card>
  )
}

export default function FamilyPage() {
  const userId = useUserId()
  const [members, setMembers] = React.useState<FamilyMemberResponse[]>([])
  const [loading, setLoading] = React.useState(true)
  const [sheetOpen, setSheetOpen] = React.useState(false)
  const [editingMember, setEditingMember] =
    React.useState<FamilyMemberResponse | null>(null)

  const fetchMembers = React.useCallback(async () => {
    if (!userId) return
    setLoading(true)
    try {
      const res = await fetch(`/api/family-members?userId=${userId}`)
      const data = await res.json()
      setMembers(data.members ?? [])
    } catch {
      // silently fail
    } finally {
      setLoading(false)
    }
  }, [userId])

  React.useEffect(() => {
    fetchMembers()
  }, [fetchMembers])

  async function handleDelete(id: string) {
    if (!confirm("Remove this family member? Their appointments will remain."))
      return
    await fetch(`/api/family-members/${id}`, { method: "DELETE" })
    fetchMembers()
  }

  function handleEdit(m: FamilyMemberResponse) {
    setEditingMember(m)
    setSheetOpen(true)
  }

  return (
    <DashboardShell title="Family Members">
      <div className="flex flex-col gap-6 py-4 md:gap-6 md:py-6">
        {/* Header */}
        <div className="flex items-center justify-between px-4 lg:px-6">
          <div>
            <p className="text-sm text-muted-foreground">
              {members.length} member{members.length !== 1 ? "s" : ""} added
            </p>
          </div>
          <Button
            onClick={() => {
              setEditingMember(null)
              setSheetOpen(true)
            }}
          >
            <PlusIcon className="size-4" />
            Add Member
          </Button>
        </div>

        {/* Grid */}
        {loading ? (
          <div className="grid gap-4 px-4 lg:px-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {[...Array(4)].map((_, i) => (
              <Skeleton key={i} className="h-24 rounded-xl" />
            ))}
          </div>
        ) : members.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-16 text-muted-foreground px-4">
            <UserIcon className="size-10 opacity-20" />
            <p className="text-sm">
              No family members yet. Add your first one to get started.
            </p>
            <Button
              variant="outline"
              onClick={() => {
                setEditingMember(null)
                setSheetOpen(true)
              }}
            >
              <PlusIcon className="size-4" />
              Add Family Member
            </Button>
          </div>
        ) : (
          <div className="grid gap-4 px-4 lg:px-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {members.map((m) => (
              <MemberCard
                key={m._id}
                member={m}
                onEdit={handleEdit}
                onDelete={handleDelete}
              />
            ))}
          </div>
        )}
      </div>

      {userId && (
        <FamilyMemberSheet
          open={sheetOpen}
          onOpenChange={(open) => {
            setSheetOpen(open)
            if (!open) setEditingMember(null)
          }}
          userId={userId}
          member={editingMember}
          onSuccess={fetchMembers}
        />
      )}
    </DashboardShell>
  )
}
