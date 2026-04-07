"use client"

import { useState } from "react"
import {
  FileTextIcon,
  FileSpreadsheetIcon,
  FileIcon,
  Trash2Icon,
  PencilIcon,
  DownloadIcon,
  EyeIcon,
  GripVerticalIcon,
  FolderInputIcon,
} from "lucide-react"
import { toast } from "sonner"
import { useDraggable } from "@dnd-kit/core"
import { CSS } from "@dnd-kit/utilities"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import type { FileAsset, StorageFolder } from "@/store/storage-store"
import { useStorageStore } from "@/store/storage-store"
import { useWorkspace } from "@/contexts/workspace-context"

export function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export function FileTypeIcon({ format, className = "size-10" }: { format: string; className?: string }) {
  if (format === "pdf") return <FileTextIcon className={`${className} text-red-500`} />
  if (format === "xlsx" || format === "csv") return <FileSpreadsheetIcon className={`${className} text-green-600`} />
  if (format === "docx") return <FileTextIcon className={`${className} text-blue-500`} />
  return <FileIcon className={`${className} text-muted-foreground`} />
}

interface Props {
  file: FileAsset
  folders: StorageFolder[]
  onPreview: (file: FileAsset) => void
}

export function FileCard({ file, folders, onPreview }: Props) {
  const { activeWorkspace } = useWorkspace()
  const activeWorkspaceId = activeWorkspace?._id
  const { removeFile, renameFile, moveFile, currentFolderId } = useStorageStore()
  const [renaming, setRenaming] = useState(false)
  const [nameInput, setNameInput] = useState(file.name)
  const [deleting, setDeleting] = useState(false)

  const isImage = file.resourceType === "image"

  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `file-${file._id}`,
    data: { type: "file", fileId: file._id },
  })

  const style = transform
    ? { transform: CSS.Translate.toString(transform) }
    : undefined

  async function handleDelete() {
    if (!activeWorkspaceId) return
    setDeleting(true)
    try {
      const res = await fetch(`/api/storage/files/${file._id}`, {
        method: "DELETE",
        headers: { "x-workspace-id": activeWorkspaceId },
      })
      if (!res.ok) throw new Error()
      removeFile(file._id)
      toast.success(`${file.name} deleted`)
    } catch {
      toast.error("Failed to delete file")
      setDeleting(false)
    }
  }

  async function handleRename() {
    if (!activeWorkspaceId || nameInput.trim() === file.name) {
      setRenaming(false)
      return
    }
    try {
      const res = await fetch(`/api/storage/files/${file._id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", "x-workspace-id": activeWorkspaceId },
        body: JSON.stringify({ name: nameInput.trim() }),
      })
      if (!res.ok) throw new Error()
      renameFile(file._id, nameInput.trim())
      toast.success("Renamed")
    } catch {
      toast.error("Failed to rename")
      setNameInput(file.name)
    } finally {
      setRenaming(false)
    }
  }

  async function handleMoveToFolder(targetFolderId: string | null) {
    if (!activeWorkspaceId) return
    // Optimistic update
    moveFile(file._id, targetFolderId)
    try {
      const res = await fetch(`/api/storage/files/${file._id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", "x-workspace-id": activeWorkspaceId },
        body: JSON.stringify({ folderId: targetFolderId }),
      })
      if (!res.ok) throw new Error()
      toast.success(targetFolderId ? "Moved to folder" : "Moved to root")
    } catch {
      // Revert
      moveFile(file._id, file.folderId ?? null)
      toast.error("Failed to move file")
    }
  }

  const availableFolders = folders.filter((f) => f._id !== currentFolderId)

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`group relative rounded-xl border bg-card overflow-hidden flex flex-col transition-shadow hover:shadow-md ${
        isDragging ? "opacity-30 shadow-lg z-50" : ""
      } ${deleting ? "opacity-50 pointer-events-none" : ""}`}
    >
      {/* Drag handle */}
      <button
        {...listeners}
        {...attributes}
        className="absolute top-2 left-2 z-10 size-6 flex items-center justify-center rounded opacity-0 group-hover:opacity-100 bg-background/80 backdrop-blur-sm cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground transition-opacity"
        onClick={(e) => e.stopPropagation()}
      >
        <GripVerticalIcon className="size-3.5" />
      </button>

      {/* Thumbnail / Icon area */}
      <div
        className="h-36 flex items-center justify-center bg-muted/40 cursor-pointer"
        onClick={() => onPreview(file)}
      >
        {isImage ? (
          <img src={file.url} alt={file.name} className="w-full h-full object-cover" />
        ) : (
          <FileTypeIcon format={file.format} />
        )}
      </div>

      {/* Info */}
      <div className="p-3 flex flex-col gap-1">
        {renaming ? (
          <Input
            autoFocus
            value={nameInput}
            onChange={(e) => setNameInput(e.target.value)}
            onBlur={handleRename}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleRename()
              if (e.key === "Escape") { setRenaming(false); setNameInput(file.name) }
            }}
            className="h-7 text-sm px-1"
          />
        ) : (
          <p className="text-sm font-medium truncate" title={file.name}>{file.name}</p>
        )}
        <p className="text-xs text-muted-foreground">{formatBytes(file.size)} · {file.format.toUpperCase()}</p>
      </div>

      {/* Actions menu */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="absolute top-2 right-2 size-7 opacity-0 group-hover:opacity-100 bg-background/80 backdrop-blur-sm"
          >
            <span className="sr-only">Actions</span>
            <svg width="15" height="15" viewBox="0 0 15 15" fill="currentColor">
              <circle cx="7.5" cy="2.5" r="1.25" />
              <circle cx="7.5" cy="7.5" r="1.25" />
              <circle cx="7.5" cy="12.5" r="1.25" />
            </svg>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-44">
          <DropdownMenuItem onClick={() => onPreview(file)}>
            <EyeIcon className="size-4 mr-2" /> Preview
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => { setRenaming(true); setNameInput(file.name) }}>
            <PencilIcon className="size-4 mr-2" /> Rename
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <a href={file.url} download={file.name} target="_blank" rel="noopener noreferrer">
              <DownloadIcon className="size-4 mr-2" /> Download
            </a>
          </DropdownMenuItem>

          {/* Move to folder submenu */}
          {(availableFolders.length > 0 || file.folderId) && (
            <DropdownMenuSub>
              <DropdownMenuSubTrigger>
                <FolderInputIcon className="size-4 mr-2" /> Move to
              </DropdownMenuSubTrigger>
              <DropdownMenuSubContent>
                {file.folderId && (
                  <DropdownMenuItem onClick={() => handleMoveToFolder(null)}>
                    Root (no folder)
                  </DropdownMenuItem>
                )}
                {availableFolders.map((f) => (
                  <DropdownMenuItem key={f._id} onClick={() => handleMoveToFolder(f._id)}>
                    {f.name}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuSubContent>
            </DropdownMenuSub>
          )}

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
