"use client"

import { useEffect, useState } from "react"
import { toast } from "sonner"
import { useStorageStore, type FileAsset, type StorageFolder, type FilterType } from "@/store/storage-store"
import { useWorkspace } from "@/contexts/workspace-context"
import { StorageHeader } from "@/components/storage/StorageHeader"
import { FileGrid } from "@/components/storage/FileGrid"
import { FileList } from "@/components/storage/FileList"
import { FileUploader } from "@/components/storage/FileUploader"
import { FilePreviewModal } from "@/components/storage/FilePreviewModal"
import { CreateFolderDialog } from "@/components/storage/CreateFolderDialog"

function filterFiles(
  files: FileAsset[],
  type: FilterType,
  query: string,
  folderId: string | null
) {
  // Always scope to current folder
  let result = files.filter((f) => (f.folderId ?? null) === folderId)
  if (type !== "all") result = result.filter((f) => f.resourceType === type)
  if (query.trim()) {
    const q = query.toLowerCase()
    result = result.filter((f) => f.name.toLowerCase().includes(q))
  }
  return result
}

export default function StoragePage() {
  const { activeWorkspace } = useWorkspace()
  const activeWorkspaceId = activeWorkspace?._id
  const {
    files,
    setFiles,
    folders,
    setFolders,
    currentFolderId,
    setCurrentFolderId,
    viewMode,
    filterType,
    searchQuery,
  } = useStorageStore()

  const [loading, setLoading] = useState(true)
  const [uploaderOpen, setUploaderOpen] = useState(false)
  const [folderDialogOpen, setFolderDialogOpen] = useState(false)
  const [previewFile, setPreviewFile] = useState<FileAsset | null>(null)

  useEffect(() => {
    if (!activeWorkspaceId) return

    setLoading(true)
    Promise.all([
      fetch("/api/storage/files", {
        headers: { "x-workspace-id": activeWorkspaceId },
      }).then((r) => r.json()),
      fetch("/api/storage/folders", {
        headers: { "x-workspace-id": activeWorkspaceId },
      }).then((r) => r.json()),
    ])
      .then(([filesData, foldersData]) => {
        setFiles(filesData.files ?? [])
        setFolders(foldersData.folders ?? [])
      })
      .catch(() => toast.error("Failed to load storage"))
      .finally(() => setLoading(false))
  }, [activeWorkspaceId, setFiles, setFolders])

  const currentFolder = currentFolderId
    ? (folders.find((f) => f._id === currentFolderId) ?? null)
    : null

  const visibleFiles = filterFiles(files, filterType, searchQuery, currentFolderId)

  // At root, also pass folders to the grid/list
  const visibleFolders = currentFolderId ? [] : folders

  function handleFolderOpen(folder: StorageFolder) {
    setCurrentFolderId(folder._id)
  }

  function handleGoRoot() {
    setCurrentFolderId(null)
  }

  return (
    <div className="flex flex-col gap-6 p-6">
      <StorageHeader
        onUpload={() => setUploaderOpen(true)}
        onNewFolder={() => setFolderDialogOpen(true)}
        totalFiles={visibleFiles.length}
        currentFolder={currentFolder}
        onGoRoot={handleGoRoot}
      />

      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 gap-4">
          {Array.from({ length: 10 }).map((_, i) => (
            <div key={i} className="rounded-xl border bg-muted/30 animate-pulse h-52" />
          ))}
        </div>
      ) : viewMode === "grid" ? (
        <FileGrid
          files={visibleFiles}
          folders={visibleFolders}
          onPreview={setPreviewFile}
          onFolderOpen={handleFolderOpen}
        />
      ) : (
        <FileList
          files={visibleFiles}
          folders={visibleFolders}
          onPreview={setPreviewFile}
          onFolderOpen={handleFolderOpen}
        />
      )}

      <FileUploader open={uploaderOpen} onClose={() => setUploaderOpen(false)} />
      <CreateFolderDialog open={folderDialogOpen} onClose={() => setFolderDialogOpen(false)} />
      <FilePreviewModal file={previewFile} onClose={() => setPreviewFile(null)} />
    </div>
  )
}
