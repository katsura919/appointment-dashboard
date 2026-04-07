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
  FolderIcon,
  GripVerticalIcon,
  FolderOpenIcon,
  FolderInputIcon,
} from "lucide-react"
import { toast } from "sonner"
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  useDraggable,
  useDroppable,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core"
import { CSS } from "@dnd-kit/utilities"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
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
import type { FileAsset, StorageFolder } from "@/store/storage-store"
import { useStorageStore } from "@/store/storage-store"
import { useWorkspace } from "@/contexts/workspace-context"
import { format } from "date-fns"
import { formatBytes } from "./FileCard"

// ——— File type icon (small) ———
function FileTypeIcon({ file }: { file: FileAsset }) {
  if (file.resourceType === "image") return <ImageIcon className="size-4 text-violet-500" />
  if (file.format === "pdf") return <FileTextIcon className="size-4 text-red-500" />
  if (file.format === "xlsx" || file.format === "csv") return <FileSpreadsheetIcon className="size-4 text-green-600" />
  if (file.format === "docx") return <FileTextIcon className="size-4 text-blue-500" />
  return <FileIcon className="size-4 text-muted-foreground" />
}

// ——— Droppable folder row ———
function FolderRow({
  folder,
  fileCount,
  onOpen,
}: {
  folder: StorageFolder
  fileCount: number
  onOpen: (folder: StorageFolder) => void
}) {
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
        headers: { "Content-Type": "application/json", "x-workspace-id": activeWorkspace._id },
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
    <tr
      ref={setNodeRef}
      className={`border-b last:border-0 cursor-pointer transition-colors ${
        isOver ? "bg-primary/10" : "hover:bg-muted/30"
      } ${deleting ? "opacity-50" : ""}`}
      onClick={() => !renaming && onOpen(folder)}
    >
      <td className="py-3 px-4 w-8 text-muted-foreground/40" />
      <td className="py-3 px-4">
        <div className="flex items-center gap-3">
          <FolderIcon
            className={`size-4 transition-colors ${isOver ? "text-primary" : "text-amber-400"}`}
          />
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
              className="h-7 text-sm max-w-xs"
              onClick={(e) => e.stopPropagation()}
            />
          ) : (
            <span className="text-sm font-medium">
              {folder.name}
              {isOver && <span className="ml-2 text-xs text-primary font-normal">Drop to move here</span>}
            </span>
          )}
        </div>
      </td>
      <td className="py-3 px-4 text-sm text-muted-foreground">Folder</td>
      <td className="py-3 px-4 text-sm text-muted-foreground">{fileCount} {fileCount === 1 ? "item" : "items"}</td>
      <td className="py-3 px-4 text-sm text-muted-foreground">
        {format(new Date(folder.createdAt), "MMM d, yyyy")}
      </td>
      <td className="py-3 px-4">
        <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
          <Button variant="ghost" size="icon" className="size-7" onClick={() => { setRenaming(true); setNameInput(folder.name) }}>
            <PencilIcon className="size-4" />
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

// ——— Root drop zone row ———
function RootDropZoneRow() {
  const { isOver, setNodeRef } = useDroppable({ id: "root-zone", data: { type: "root" } })
  return (
    <tr ref={setNodeRef} className={`border-b transition-colors ${isOver ? "bg-primary/10" : ""}`}>
      <td colSpan={6} className="py-2 px-4">
        <div className={`flex items-center gap-2 rounded-lg border-2 border-dashed px-3 py-2 text-xs transition-colors ${
          isOver ? "border-primary text-primary" : "border-muted-foreground/30 text-muted-foreground"
        }`}>
          <FolderOpenIcon className="size-3.5" />
          {isOver ? "Release to move to root" : "Drag here to move out of folder"}
        </div>
      </td>
    </tr>
  )
}

// ——— Draggable file row ———
function FileRow({ file, folders, onPreview }: { file: FileAsset; folders: StorageFolder[]; onPreview: (f: FileAsset) => void }) {
  const { activeWorkspace } = useWorkspace()
  const { removeFile, renameFile, moveFile, currentFolderId } = useStorageStore()
  const [renaming, setRenaming] = useState(false)
  const [nameInput, setNameInput] = useState(file.name)
  const [deleting, setDeleting] = useState(false)

  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `file-${file._id}`,
    data: { type: "file", fileId: file._id },
  })

  const style = transform ? { transform: CSS.Translate.toString(transform) } : undefined

  async function handleDelete() {
    if (!activeWorkspace?._id) return
    setDeleting(true)
    try {
      const res = await fetch(`/api/storage/files/${file._id}`, {
        method: "DELETE",
        headers: { "x-workspace-id": activeWorkspace._id },
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
    if (!activeWorkspace?._id || nameInput.trim() === file.name) {
      setRenaming(false)
      return
    }
    try {
      const res = await fetch(`/api/storage/files/${file._id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", "x-workspace-id": activeWorkspace._id },
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
    if (!activeWorkspace?._id) return
    moveFile(file._id, targetFolderId)
    try {
      const res = await fetch(`/api/storage/files/${file._id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", "x-workspace-id": activeWorkspace._id },
        body: JSON.stringify({ folderId: targetFolderId }),
      })
      if (!res.ok) throw new Error()
      toast.success(targetFolderId ? "Moved to folder" : "Moved to root")
    } catch {
      moveFile(file._id, file.folderId ?? null)
      toast.error("Failed to move file")
    }
  }

  const availableFolders = folders.filter((f) => f._id !== currentFolderId)

  return (
    <tr
      ref={setNodeRef}
      style={style}
      className={`border-b last:border-0 hover:bg-muted/30 transition-colors ${
        isDragging ? "opacity-30" : ""
      } ${deleting ? "opacity-50" : ""}`}
    >
      {/* Drag handle column */}
      <td className="py-3 px-2 w-8">
        <button
          {...listeners}
          {...attributes}
          className="size-6 flex items-center justify-center rounded text-muted-foreground/40 hover:text-muted-foreground cursor-grab active:cursor-grabbing"
        >
          <GripVerticalIcon className="size-4" />
        </button>
      </td>
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

          {(availableFolders.length > 0 || file.folderId) && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="size-7">
                  <FolderInputIcon className="size-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-40">
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
              </DropdownMenuContent>
            </DropdownMenu>
          )}

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
  folders: StorageFolder[]
  onPreview: (file: FileAsset) => void
  onFolderOpen: (folder: StorageFolder) => void
}

export function FileList({ files, folders, onPreview, onFolderOpen }: Props) {
  const { activeWorkspace } = useWorkspace()
  const { currentFolderId, moveFile, files: allFiles } = useStorageStore()
  const [activeFileId, setActiveFileId] = useState<string | null>(null)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor)
  )

  const activeFile = activeFileId ? allFiles.find((f) => f._id === activeFileId) ?? null : null

  function handleDragStart(event: DragStartEvent) {
    const data = event.active.data.current
    if (data?.type === "file") setActiveFileId(data.fileId)
  }

  async function handleDragEnd(event: DragEndEvent) {
    setActiveFileId(null)
    const { active, over } = event
    if (!over || !activeWorkspace?._id) return

    const fileId = (active.data.current as { fileId: string }).fileId
    const overData = over.data.current as { type: string; folderId?: string }

    let targetFolderId: string | null = null
    if (overData?.type === "folder") targetFolderId = overData.folderId ?? null
    else if (over.id === "root-zone") targetFolderId = null
    else return

    const file = allFiles.find((f) => f._id === fileId)
    if (!file || (file.folderId ?? null) === targetFolderId) return

    const prevFolderId = file.folderId ?? null
    moveFile(fileId, targetFolderId)

    try {
      const res = await fetch(`/api/storage/files/${fileId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", "x-workspace-id": activeWorkspace._id },
        body: JSON.stringify({ folderId: targetFolderId }),
      })
      if (!res.ok) throw new Error()
      toast.success(targetFolderId ? "Moved to folder" : "Moved to root")
    } catch {
      moveFile(fileId, prevFolderId)
      toast.error("Failed to move file")
    }
  }

  const isEmpty = folders.length === 0 && files.length === 0

  if (isEmpty) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center text-muted-foreground">
        <p className="text-base font-medium">
          {currentFolderId ? "This folder is empty" : "No files yet"}
        </p>
        <p className="text-sm mt-1">Upload files or create a folder to get started</p>
      </div>
    )
  }

  return (
    <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <div className="rounded-xl border overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b bg-muted/40">
              <th className="py-2.5 px-2 w-8" />
              <th className="py-2.5 px-4 text-left text-xs font-medium text-muted-foreground">Name</th>
              <th className="py-2.5 px-4 text-left text-xs font-medium text-muted-foreground">Type</th>
              <th className="py-2.5 px-4 text-left text-xs font-medium text-muted-foreground">Size</th>
              <th className="py-2.5 px-4 text-left text-xs font-medium text-muted-foreground">Uploaded</th>
              <th className="py-2.5 px-4 text-left text-xs font-medium text-muted-foreground">Actions</th>
            </tr>
          </thead>
          <tbody>
            {/* Root drop zone row (only when inside a folder) */}
            {currentFolderId && <RootDropZoneRow />}

            {/* Folders (only at root) */}
            {!currentFolderId &&
              folders.map((folder) => {
                const count = allFiles.filter((f) => f.folderId === folder._id).length
                return (
                  <FolderRow
                    key={folder._id}
                    folder={folder}
                    fileCount={count}
                    onOpen={onFolderOpen}
                  />
                )
              })}

            {/* Files */}
            {files.map((file) => (
              <FileRow key={file._id} file={file} folders={folders} onPreview={onPreview} />
            ))}
          </tbody>
        </table>
      </div>

      <DragOverlay dropAnimation={null}>
        {activeFile ? (
          <div className="rounded-lg border bg-card shadow-xl px-3 py-2 flex items-center gap-2 text-sm rotate-1 opacity-95">
            <GripVerticalIcon className="size-4 text-muted-foreground" />
            <span className="font-medium truncate max-w-48">{activeFile.name}</span>
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  )
}
