"use client"

import { useState } from "react"
import { FolderIcon, Trash2Icon, PencilIcon } from "lucide-react"
import { toast } from "sonner"
import { useDroppable } from "@dnd-kit/core"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import type { StorageFolder } from "@/store/storage-store"
import { useStorageStore } from "@/store/storage-store"
import { useWorkspace } from "@/contexts/workspace-context"

interface Props {
  folder: StorageFolder
  fileCount: number
  onOpen: (folder: StorageFolder) => void
}

export function FolderCard({ folder, fileCount, onOpen }: Props) {
  const { activeWorkspace } = useWorkspace()
  const { removeFolder, renameFolder } = useStorageStore()
  const [renaming, setRenaming] = useState(false)
  const [nameInput, setNameInput] = useState(folder.name)
  const [deleting, setDeleting] = useState(false)

  const { isOver, setNodeRef } = useDroppable({
    id: `folder-${folder._id}`,
    data: { type: "folder", folderId: folder._id },
  })

  async function handleDelete() {
    if (!activeWorkspace?._id) return
    setDeleting(true)
    try {
      const res = await fetch(`/api/storage/folders/${folder._id}`, {
        method: "DELETE",
        headers: { "x-workspace-id": activeWorkspace._id },
      })
      if (!res.ok) throw new Error()
      const { deletedFiles } = await res.json()
      removeFolder(folder._id)
      toast.success(
        deletedFiles > 0
          ? `"${folder.name}" and ${deletedFiles} file${deletedFiles !== 1 ? "s" : ""} deleted`
          : `"${folder.name}" deleted`
      )
    } catch {
      toast.error("Failed to delete folder")
      setDeleting(false)
    }
  }

  async function handleRename() {
    if (!activeWorkspace?._id || nameInput.trim() === folder.name) {
      setRenaming(false)
      return
    }
    try {
      const res = await fetch(`/api/storage/folders/${folder._id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "x-workspace-id": activeWorkspace._id,
        },
        body: JSON.stringify({ name: nameInput.trim() }),
      })
      if (!res.ok) throw new Error()
      renameFolder(folder._id, nameInput.trim())
      toast.success("Folder renamed")
    } catch {
      toast.error("Failed to rename folder")
      setNameInput(folder.name)
    } finally {
      setRenaming(false)
    }
  }

  return (
    <div
      ref={setNodeRef}
      className={`group relative rounded-xl border-2 bg-card overflow-hidden flex flex-col transition-all cursor-pointer select-none ${
        isOver
          ? "border-primary bg-primary/5 shadow-md scale-[1.02]"
          : "border-border hover:border-primary/40 hover:shadow-sm"
      } ${deleting ? "opacity-50 pointer-events-none" : ""}`}
      onClick={() => !renaming && onOpen(folder)}
    >
      <div className="h-36 flex flex-col items-center justify-center gap-2 bg-muted/20">
        <FolderIcon
          className={`size-12 transition-colors ${isOver ? "text-primary" : "text-amber-400"}`}
          fill={isOver ? "currentColor" : "#fbbf24"}
          fillOpacity={0.3}
        />
        {isOver && (
          <p className="text-xs font-medium text-primary">Drop to move here</p>
        )}
      </div>

      <div className="p-3 flex flex-col gap-0.5">
        {renaming ? (
          <Input
            autoFocus
            value={nameInput}
            onChange={(e) => setNameInput(e.target.value)}
            onBlur={handleRename}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleRename()
              if (e.key === "Escape") { setRenaming(false); setNameInput(folder.name) }
            }}
            className="h-7 text-sm px-1"
            onClick={(e) => e.stopPropagation()}
          />
        ) : (
          <p className="text-sm font-medium truncate">{folder.name}</p>
        )}
        <p className="text-xs text-muted-foreground">
          {fileCount} {fileCount === 1 ? "file" : "files"}
        </p>
      </div>

      {/* Actions menu */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="absolute top-2 right-2 size-7 opacity-0 group-hover:opacity-100 bg-background/80 backdrop-blur-sm"
            onClick={(e) => e.stopPropagation()}
          >
            <span className="sr-only">Actions</span>
            <svg width="15" height="15" viewBox="0 0 15 15" fill="currentColor">
              <circle cx="7.5" cy="2.5" r="1.25" />
              <circle cx="7.5" cy="7.5" r="1.25" />
              <circle cx="7.5" cy="12.5" r="1.25" />
            </svg>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-40" onClick={(e) => e.stopPropagation()}>
          <DropdownMenuItem onClick={() => { setRenaming(true); setNameInput(folder.name) }}>
            <PencilIcon className="size-4 mr-2" /> Rename
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            className="text-destructive focus:text-destructive"
            onClick={handleDelete}
          >
            <Trash2Icon className="size-4 mr-2" /> Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}
