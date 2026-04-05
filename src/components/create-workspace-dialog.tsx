"use client"

import { FormEvent, useEffect, useState } from "react"

import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { useWorkspace } from "@/contexts/workspace-context"

interface Workspace {
  _id: string
  name: string
  timezone: string
  ownerId: string
  members: Array<{ userId: string; role: string }>
}

interface CreateWorkspaceDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Called with the newly created workspace. If provided, the page will NOT auto-reload. */
  onSuccess?: (workspace: Workspace) => void
}



export function CreateWorkspaceDialog({ open, onOpenChange, onSuccess }: CreateWorkspaceDialogProps) {
  const [name, setName] = useState("")
  const [loading, setLoading] = useState(false)
  const { setActiveWorkspace } = useWorkspace()

  // Reset form when dialog opens
  useEffect(() => {
    if (open) setName("")
  }, [open])

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!name.trim()) return

    setLoading(true)
    try {
      const res = await fetch("/api/workspaces", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim() }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error ?? "Failed to create workspace")
      }

      const data = await res.json()
      const newWorkspace = data.workspace as Workspace

      // Switch to the newly created workspace
      setActiveWorkspace(newWorkspace)
      toast.success(`Workspace "${newWorkspace.name}" created!`)
      onOpenChange(false)

      if (onSuccess) {
        onSuccess(newWorkspace)
      } else {
        // Fallback: reload page so workspace context + sidebar refreshes
        window.location.reload()
      }
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
          <DialogTitle>Create New Workspace</DialogTitle>
          <DialogDescription>
            Workspaces let you and your team collaborate on the same dashboard data.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="workspace-name">Workspace Name</Label>
            <Input
              id="workspace-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Smith Family"
              maxLength={80}
              required
              autoFocus
            />
            <p className="text-xs text-muted-foreground">
              You'll be the owner. You can invite others after creation.
            </p>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading || !name.trim()}>
              {loading ? "Creating…" : "Create Workspace"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
