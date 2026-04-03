"use client"

import * as React from "react"
import { toast } from "sonner"
import { useRouter } from "next/navigation"
import { useWorkspace } from "@/contexts/workspace-context"
import { useWorkspaceId } from "@/hooks/use-workspace-id"
import { useUserId } from "@/hooks/use-user-id"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { Skeleton } from "@/components/ui/skeleton"
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
import { UserPlus, Trash2, LogOut, ShieldCheck, User as UserIcon, Shield } from "lucide-react"

// ─── Types ────────────────────────────────────────────────────────────────────
type MemberRole = "owner" | "admin" | "member"

interface WorkspaceMember {
  userId: string
  name: string
  email: string
  role: MemberRole
}

// ─── Role Badge ───────────────────────────────────────────────────────────────
const ROLE_COLORS: Record<MemberRole, string> = {
  owner: "bg-amber-100 text-amber-800 border-amber-200",
  admin: "bg-blue-100 text-blue-800 border-blue-200",
  member: "bg-slate-100 text-slate-700 border-slate-200",
}

const ROLE_ICONS: Record<MemberRole, React.ReactNode> = {
  owner: <ShieldCheck className="size-3" />,
  admin: <Shield className="size-3" />,
  member: <UserIcon className="size-3" />,
}

function RoleBadge({ role }: { role: MemberRole }) {
  return (
    <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium ${ROLE_COLORS[role]}`}>
      {ROLE_ICONS[role]}
      {role.charAt(0).toUpperCase() + role.slice(1)}
    </span>
  )
}

// ─── Invite Member Dialog ─────────────────────────────────────────────────────
function InviteMemberDialog({
  open,
  onOpenChange,
  workspaceId,
  onSuccess,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  workspaceId: string
  onSuccess: () => void
}) {
  const [email, setEmail] = React.useState("")
  const [role, setRole] = React.useState<"admin" | "member">("member")
  const [loading, setLoading] = React.useState(false)

  React.useEffect(() => {
    if (open) { setEmail(""); setRole("member") }
  }, [open])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    try {
      const res = await fetch(`/api/workspaces/${workspaceId}/members`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), role }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? "Failed to invite")
      toast.success(data.message)
      onSuccess()
      onOpenChange(false)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Something went wrong")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Invite a Member</DialogTitle>
          <DialogDescription>
            Enter the email of someone who already has an account. They&apos;ll be added immediately.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="invite-email">Email Address</Label>
            <Input
              id="invite-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="colleague@example.com"
              required
              autoFocus
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="invite-role">Role</Label>
            <Select value={role} onValueChange={(v) => setRole(v as "admin" | "member")}>
              <SelectTrigger id="invite-role">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="member">Member — can view and use the workspace</SelectItem>
                <SelectItem value="admin">Admin — can also invite and remove members</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading || !email.trim()}>
              {loading ? "Inviting…" : "Add Member"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

// ─── Settings Page ────────────────────────────────────────────────────────────
export default function SettingsPage() {
  const { activeWorkspace, workspaces, setActiveWorkspace } = useWorkspace()
  const workspaceId = useWorkspaceId()
  const currentUserId = useUserId()
  const router = useRouter()

  // Workspace tab state
  const [wsName, setWsName] = React.useState("")
  const [savingName, setSavingName] = React.useState(false)

  // Members tab state
  const [members, setMembers] = React.useState<WorkspaceMember[]>([])
  const [membersLoading, setMembersLoading] = React.useState(true)
  const [inviteOpen, setInviteOpen] = React.useState(false)

  // Confirmation dialogs
  const [deleteWorkspaceOpen, setDeleteWorkspaceOpen] = React.useState(false)
  const [removeMemberTarget, setRemoveMemberTarget] = React.useState<WorkspaceMember | null>(null)
  const [leaveOpen, setLeaveOpen] = React.useState(false)

  // Sync name field when active workspace changes
  React.useEffect(() => {
    setWsName(activeWorkspace?.name ?? "")
  }, [activeWorkspace])

  // Fetch members whenever the workspace changes
  const fetchMembers = React.useCallback(async () => {
    if (!workspaceId) return
    setMembersLoading(true)
    try {
      const res = await fetch(`/api/workspaces/${workspaceId}/members`)
      const data = await res.json()
      setMembers(data.members ?? [])
    } catch {
      // silently fail
    } finally {
      setMembersLoading(false)
    }
  }, [workspaceId])

  React.useEffect(() => { fetchMembers() }, [fetchMembers])

  // My role in this workspace
  const myMember = members.find((m) => m.userId === currentUserId)
  const myRole = myMember?.role ?? "member"
  const amOwner = myRole === "owner"
  const canManage = myRole === "owner" || myRole === "admin"

  // ── Rename workspace ────────────────────────────────────────────────────────
  async function handleRename(e: React.FormEvent) {
    e.preventDefault()
    if (!workspaceId || !wsName.trim() || wsName.trim() === activeWorkspace?.name) return
    setSavingName(true)
    try {
      const res = await fetch(`/api/workspaces/${workspaceId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: wsName.trim() }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      toast.success("Workspace renamed successfully")
      // Update active workspace name in context
      if (activeWorkspace) setActiveWorkspace({ ...activeWorkspace, name: wsName.trim() })
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to rename")
    } finally {
      setSavingName(false)
    }
  }

  // ── Change member role ──────────────────────────────────────────────────────
  async function handleRoleChange(targetUserId: string, newRole: "admin" | "member") {
    if (!workspaceId) return
    try {
      const res = await fetch(`/api/workspaces/${workspaceId}/members/${targetUserId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: newRole }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      toast.success("Role updated")
      fetchMembers()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to update role")
    }
  }

  // ── Remove member ───────────────────────────────────────────────────────────
  async function handleRemoveMember(targetUserId: string) {
    if (!workspaceId) return
    try {
      const res = await fetch(`/api/workspaces/${workspaceId}/members/${targetUserId}`, {
        method: "DELETE",
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      toast.success(data.message)
      setRemoveMemberTarget(null)
      fetchMembers()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to remove member")
    }
  }

  // ── Leave workspace ─────────────────────────────────────────────────────────
  async function handleLeave() {
    if (!workspaceId || !currentUserId) return
    try {
      const res = await fetch(`/api/workspaces/${workspaceId}/members/${currentUserId}`, {
        method: "DELETE",
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      toast.success(data.message)
      // Switch to another workspace or go to dashboard
      const remaining = workspaces.filter((w) => w._id !== workspaceId)
      if (remaining.length > 0) {
        setActiveWorkspace(remaining[0])
      }
      router.push("/dashboard")
      window.location.reload()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to leave workspace")
    }
  }

  // ── Delete workspace ────────────────────────────────────────────────────────
  async function handleDeleteWorkspace() {
    if (!workspaceId) return
    try {
      const res = await fetch(`/api/workspaces/${workspaceId}`, { method: "DELETE" })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      toast.success("Workspace deleted")
      const remaining = workspaces.filter((w) => w._id !== workspaceId)
      if (remaining.length > 0) {
        setActiveWorkspace(remaining[0])
      }
      router.push("/dashboard")
      window.location.reload()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to delete workspace")
      setDeleteWorkspaceOpen(false)
    }
  }

  if (!activeWorkspace) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground">
        No workspace selected.
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6 p-6 max-w-3xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Manage your workspace and its members.
        </p>
      </div>

      <Tabs defaultValue="workspace">
        <TabsList>
          <TabsTrigger value="workspace">Workspace</TabsTrigger>
          <TabsTrigger value="members">Members</TabsTrigger>
        </TabsList>

        {/* ── Workspace Tab ──────────────────────────────────────────────── */}
        <TabsContent value="workspace" className="flex flex-col gap-6 mt-6">
          {/* Rename */}
          <Card>
            <CardHeader>
              <CardTitle>Workspace Name</CardTitle>
              <CardDescription>
                Change how your workspace appears in the sidebar.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleRename} className="flex gap-3 items-end">
                <div className="flex flex-col gap-1.5 flex-1">
                  <Label htmlFor="ws-name">Name</Label>
                  <Input
                    id="ws-name"
                    value={wsName}
                    onChange={(e) => setWsName(e.target.value)}
                    placeholder="Workspace name"
                    maxLength={80}
                    disabled={!canManage}
                  />
                </div>
                <Button
                  type="submit"
                  disabled={savingName || !wsName.trim() || wsName.trim() === activeWorkspace.name || !canManage}
                >
                  {savingName ? "Saving…" : "Save"}
                </Button>
              </form>
              {!canManage && (
                <p className="text-xs text-muted-foreground mt-2">
                  Only owners and admins can rename the workspace.
                </p>
              )}
            </CardContent>
          </Card>

          {/* Workspace ID */}
          <Card>
            <CardHeader>
              <CardTitle>Workspace ID</CardTitle>
              <CardDescription>
                Use this ID when referring to this workspace in support or integrations.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <code className="text-xs bg-muted rounded px-2 py-1.5 block w-full font-mono break-all">
                {activeWorkspace._id}
              </code>
            </CardContent>
          </Card>

          {/* Danger Zone */}
          {amOwner && (
            <Card className="border-destructive/30">
              <CardHeader>
                <CardTitle className="text-destructive">Danger Zone</CardTitle>
                <CardDescription>
                  Irreversible actions. Proceed with caution.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">Delete this workspace</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      All data will be retained, but you must remove all other members first.
                    </p>
                  </div>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => setDeleteWorkspaceOpen(true)}
                  >
                    <Trash2 className="size-4 mr-1.5" />
                    Delete
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* ── Members Tab ───────────────────────────────────────────────────── */}
        <TabsContent value="members" className="flex flex-col gap-6 mt-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
              <div>
                <CardTitle>Members</CardTitle>
                <CardDescription>
                  {members.length} {members.length === 1 ? "person" : "people"} in this workspace
                </CardDescription>
              </div>
              {canManage && (
                <Button size="sm" onClick={() => setInviteOpen(true)}>
                  <UserPlus className="size-4 mr-1.5" />
                  Invite Member
                </Button>
              )}
            </CardHeader>
            <CardContent className="p-0">
              <Separator />
              {membersLoading ? (
                <div className="flex flex-col gap-3 p-4">
                  {[0, 1, 2].map((i) => (
                    <div key={i} className="flex items-center gap-3">
                      <Skeleton className="size-9 rounded-full" />
                      <div className="flex flex-col gap-1.5 flex-1">
                        <Skeleton className="h-4 w-36" />
                        <Skeleton className="h-3 w-48" />
                      </div>
                      <Skeleton className="h-6 w-16 rounded-full" />
                    </div>
                  ))}
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Member</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead className="w-[80px]" />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {members.map((m) => {
                      const isSelf = m.userId === currentUserId
                      const isTargetOwner = m.role === "owner"
                      return (
                        <TableRow key={m.userId}>
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <div className="size-9 rounded-full bg-muted flex items-center justify-center font-semibold text-sm shrink-0">
                                {m.name.charAt(0).toUpperCase()}
                              </div>
                              <div>
                                <p className="text-sm font-medium leading-none">{m.name} {isSelf && <span className="text-muted-foreground font-normal">(you)</span>}</p>
                                <p className="text-xs text-muted-foreground mt-0.5">{m.email}</p>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            {amOwner && !isSelf && !isTargetOwner ? (
                              <Select
                                value={m.role}
                                onValueChange={(v) => handleRoleChange(m.userId, v as "admin" | "member")}
                              >
                                <SelectTrigger className="h-7 w-28 text-xs">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="admin">Admin</SelectItem>
                                  <SelectItem value="member">Member</SelectItem>
                                </SelectContent>
                              </Select>
                            ) : (
                              <RoleBadge role={m.role} />
                            )}
                          </TableCell>
                          <TableCell>
                            {isSelf && !isTargetOwner && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-muted-foreground hover:text-destructive h-7 px-2"
                                onClick={() => setLeaveOpen(true)}
                              >
                                <LogOut className="size-3.5 mr-1" />
                                Leave
                              </Button>
                            )}
                            {!isSelf && canManage && !isTargetOwner && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-muted-foreground hover:text-destructive h-7 px-2"
                                onClick={() => setRemoveMemberTarget(m)}
                              >
                                <Trash2 className="size-3.5" />
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* ── Modals ── */}
      <InviteMemberDialog
        open={inviteOpen}
        onOpenChange={setInviteOpen}
        workspaceId={workspaceId ?? ""}
        onSuccess={fetchMembers}
      />

      {/* Remove member confirm */}
      <AlertDialog open={!!removeMemberTarget} onOpenChange={(v) => !v && setRemoveMemberTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove {removeMemberTarget?.name}?</AlertDialogTitle>
            <AlertDialogDescription>
              They will lose access to this workspace immediately. Their data will remain intact.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-white hover:bg-destructive/90"
              onClick={() => removeMemberTarget && handleRemoveMember(removeMemberTarget.userId)}
            >
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Leave workspace confirm */}
      <AlertDialog open={leaveOpen} onOpenChange={setLeaveOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Leave this workspace?</AlertDialogTitle>
            <AlertDialogDescription>
              You will lose access to all data in &ldquo;{activeWorkspace.name}&rdquo;. You can be invited back by an owner or admin.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-white hover:bg-destructive/90"
              onClick={handleLeave}
            >
              Leave Workspace
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete workspace confirm */}
      <AlertDialog open={deleteWorkspaceOpen} onOpenChange={setDeleteWorkspaceOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete &ldquo;{activeWorkspace.name}&rdquo;?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the workspace. Your appointments, family members, and well-being data will remain but won&apos;t be accessible. Remove all other members first.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-white hover:bg-destructive/90"
              onClick={handleDeleteWorkspace}
            >
              Delete Workspace
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
