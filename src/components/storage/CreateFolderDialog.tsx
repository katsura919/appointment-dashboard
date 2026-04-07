"use client"

import { useState } from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useStorageStore } from "@/store/storage-store"
import { useWorkspace } from "@/contexts/workspace-context"

interface Props {
  open: boolean
  onClose: () => void
}

export function CreateFolderDialog({ open, onClose }: Props) {
  const { activeWorkspace } = useWorkspace()
  const { addFolder } = useStorageStore()
  const [name, setName] = useState("")
  const [loading, setLoading] = useState(false)

  async function handleCreate() {
    if (!activeWorkspace?._id || !name.trim()) return
    setLoading(true)
    try {
      const res = await fetch("/api/storage/folders", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-workspace-id": activeWorkspace._id,
        },
        body: JSON.stringify({ name: name.trim() }),
      })
      if (!res.ok) throw new Error("Failed to create folder")
      const { folder } = await res.json()
      addFolder(folder)
      toast.success(`Folder "${folder.name}" created`)
      setName("")
      onClose()
    } catch {
      toast.error("Failed to create folder")
    } finally {
      setLoading(false)
    }
  }

  function handleClose() {
    if (loading) return
    setName("")
    onClose()
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>New Folder</DialogTitle>
        </DialogHeader>
        <div className="space-y-1.5">
          <Label htmlFor="folder-name">Folder name</Label>
          <Input
            id="folder-name"
            placeholder="e.g. Medical Records"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleCreate()}
            autoFocus
          />
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={handleClose} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={handleCreate} disabled={loading || !name.trim()}>
            {loading ? "Creating…" : "Create"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
