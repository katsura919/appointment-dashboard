"use client"

import {
  DndContext,
  DragOverlay,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  useDroppable,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core"
import { useState } from "react"
import { FolderOpenIcon } from "lucide-react"
import { toast } from "sonner"
import type { FileAsset, StorageFolder } from "@/store/storage-store"
import { useStorageStore } from "@/store/storage-store"
import { useWorkspace } from "@/contexts/workspace-context"
import { FileCard, FileTypeIcon, formatBytes } from "./FileCard"
import { FolderCard } from "./FolderCard"

// ——— Root drop zone (visible when inside a folder) ———
function RootDropZone() {
  const { isOver, setNodeRef } = useDroppable({
    id: "root-zone",
    data: { type: "root" },
  })

  return (
    <div
      ref={setNodeRef}
      className={`col-span-full flex items-center justify-center gap-2 rounded-xl border-2 border-dashed p-4 text-sm transition-colors ${
        isOver
          ? "border-primary bg-primary/5 text-primary"
          : "border-muted-foreground/30 text-muted-foreground"
      }`}
    >
      <FolderOpenIcon className="size-4" />
      {isOver ? "Release to move to root" : "Drag here to move out of folder"}
    </div>
  )
}

// ——— Mini overlay card shown while dragging ———
function DragGhost({ file }: { file: FileAsset }) {
  const isImage = file.resourceType === "image"
  return (
    <div className="rounded-xl border bg-card shadow-2xl overflow-hidden w-40 rotate-2 opacity-95">
      <div className="h-24 flex items-center justify-center bg-muted/40">
        {isImage ? (
          <img src={file.url} alt={file.name} className="w-full h-full object-cover" />
        ) : (
          <FileTypeIcon format={file.format} className="size-8" />
        )}
      </div>
      <div className="px-2 py-1.5">
        <p className="text-xs font-medium truncate">{file.name}</p>
        <p className="text-xs text-muted-foreground">{formatBytes(file.size)}</p>
      </div>
    </div>
  )
}

interface Props {
  files: FileAsset[]
  folders: StorageFolder[]
  onPreview: (file: FileAsset) => void
  onFolderOpen: (folder: StorageFolder) => void
}

export function FileGrid({ files, folders, onPreview, onFolderOpen }: Props) {
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
    const overId = over.id as string
    const overData = over.data.current as { type: string; folderId?: string }

    let targetFolderId: string | null = null

    if (overData?.type === "folder") {
      targetFolderId = overData.folderId ?? null
    } else if (overId === "root-zone") {
      targetFolderId = null
    } else {
      return // dropped on nothing useful
    }

    const file = allFiles.find((f) => f._id === fileId)
    if (!file) return

    // Don't move if already there
    const currentFolder = file.folderId ?? null
    if (currentFolder === targetFolderId) return

    // Optimistic update
    moveFile(fileId, targetFolderId)

    try {
      const res = await fetch(`/api/storage/files/${fileId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "x-workspace-id": activeWorkspace._id,
        },
        body: JSON.stringify({ folderId: targetFolderId }),
      })
      if (!res.ok) throw new Error()
      toast.success(targetFolderId ? "Moved to folder" : "Moved to root")
    } catch {
      // Revert
      moveFile(fileId, currentFolder)
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
        <p className="text-sm mt-1">
          {currentFolderId ? "Drag files here or upload new ones" : "Upload files or create a folder to get started"}
        </p>
      </div>
    )
  }

  return (
    <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 gap-4">
        {/* Root drop zone — only visible when inside a folder */}
        {currentFolderId && <RootDropZone />}

        {/* Folders — only at root level */}
        {!currentFolderId &&
          folders.map((folder) => {
            const count = allFiles.filter((f) => f.folderId === folder._id).length
            return (
              <FolderCard
                key={folder._id}
                folder={folder}
                fileCount={count}
                onOpen={onFolderOpen}
              />
            )
          })}

        {/* Files */}
        {files.map((file) => (
          <FileCard
            key={file._id}
            file={file}
            folders={folders}
            onPreview={onPreview}
          />
        ))}
      </div>

      <DragOverlay dropAnimation={null}>
        {activeFile ? <DragGhost file={activeFile} /> : null}
      </DragOverlay>
    </DndContext>
  )
}
