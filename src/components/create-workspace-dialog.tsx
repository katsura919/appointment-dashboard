"use client"

import * as React from "react"
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

interface CreateWorkspaceDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

interface Workspace {
  _id: string
  name: string
  ownerId: string
  members: Array<{ userId: string; role: string }>
}

export function CreateWorkspaceDialog({ open, onOpenChange }: CreateWorkspaceDialogProps) {
  const [name, setName] = React.useState("")
  const [loading, setLoading] = React.useState(false)
  const { setActiveWorkspace } = useWorkspace()

  // Reset form when dialog opens
  React.useEffect(() => {
    if (open) setName("")
  }, [open])

  async function handleSubmit(e: React.FormEvent) {
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
      
      // Reload page so workspace context + sidebar refreshes fully
      window.location.reload()
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
