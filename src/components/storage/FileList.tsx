"use client"

import { useState } from "react"
import {
  FileTextIcon,
  FileSpreadsheetIcon,
  FileIcon,
  ImageIcon,
  Trash2Icon,
  PencilIcon,
  DownloadIcon,
  EyeIcon,
} from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import type { FileAsset } from "@/store/storage-store"
import { useStorageStore } from "@/store/storage-store"
import { useWorkspace } from "@/contexts/workspace-context"
import { format } from "date-fns"

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function FileTypeIcon({ file }: { file: FileAsset }) {
  if (file.resourceType === "image") return <ImageIcon className="size-4 text-violet-500" />
  if (file.format === "pdf") return <FileTextIcon className="size-4 text-red-500" />
  if (file.format === "xlsx" || file.format === "csv") return <FileSpreadsheetIcon className="size-4 text-green-600" />
  if (file.format === "docx") return <FileTextIcon className="size-4 text-blue-500" />
  return <FileIcon className="size-4 text-muted-foreground" />
}

interface RowProps {
  file: FileAsset
  onPreview: (file: FileAsset) => void
}

function FileRow({ file, onPreview }: RowProps) {
  const { activeWorkspace } = useWorkspace()
  const activeWorkspaceId = activeWorkspace?._id
  const { removeFile, renameFile } = useStorageStore()
  const [renaming, setRenaming] = useState(false)
  const [nameInput, setNameInput] = useState(file.name)
  const [deleting, setDeleting] = useState(false)

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
        headers: {
          "Content-Type": "application/json",
          "x-workspace-id": activeWorkspaceId,
        },
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

  return (
    <tr className={`border-b last:border-0 hover:bg-muted/30 transition-colors ${deleting ? "opacity-50" : ""}`}>
      <td className="py-3 px-4">
        <div className="flex items-center gap-3">
          <FileTypeIcon file={file} />
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
              className="h-7 text-sm max-w-xs"
            />
          ) : (
            <span className="text-sm font-medium truncate max-w-xs" title={file.name}>
              {file.name}
            </span>
          )}
        </div>
      </td>
      <td className="py-3 px-4 text-sm text-muted-foreground">{file.format.toUpperCase()}</td>
      <td className="py-3 px-4 text-sm text-muted-foreground">{formatBytes(file.size)}</td>
      <td className="py-3 px-4 text-sm text-muted-foreground">
        {format(new Date(file.createdAt), "MMM d, yyyy")}
      </td>
      <td className="py-3 px-4">
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" className="size-7" onClick={() => onPreview(file)}>
            <EyeIcon className="size-4" />
          </Button>
          <Button variant="ghost" size="icon" className="size-7" onClick={() => { setRenaming(true); setNameInput(file.name) }}>
            <PencilIcon className="size-4" />
          </Button>
          <Button variant="ghost" size="icon" className="size-7" asChild>
            <a href={file.url} download={file.name} target="_blank" rel="noopener noreferrer">
              <DownloadIcon className="size-4" />
            </a>
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="size-7 text-destructive hover:text-destructive"
            onClick={handleDelete}
            disabled={deleting}
          >
            <Trash2Icon className="size-4" />
          </Button>
        </div>
      </td>
    </tr>
  )
}

interface Props {
  files: FileAsset[]
  onPreview: (file: FileAsset) => void
}

export function FileList({ files, onPreview }: Props) {
  if (files.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center text-muted-foreground">
        <p className="text-base font-medium">No files yet</p>
        <p className="text-sm mt-1">Upload files using the button above</p>
      </div>
    )
  }

  return (
    <div className="rounded-xl border overflow-hidden">
      <table className="w-full">
        <thead>
          <tr className="border-b bg-muted/40">
            <th className="py-2.5 px-4 text-left text-xs font-medium text-muted-foreground">Name</th>
            <th className="py-2.5 px-4 text-left text-xs font-medium text-muted-foreground">Type</th>
            <th className="py-2.5 px-4 text-left text-xs font-medium text-muted-foreground">Size</th>
            <th className="py-2.5 px-4 text-left text-xs font-medium text-muted-foreground">Uploaded</th>
            <th className="py-2.5 px-4 text-left text-xs font-medium text-muted-foreground">Actions</th>
          </tr>
        </thead>
        <tbody>
          {files.map((file) => (
            <FileRow key={file._id} file={file} onPreview={onPreview} />
          ))}
        </tbody>
      </table>
    </div>
  )
}
