"use client"

import { useEffect, useState } from "react"
import { toast } from "sonner"
import { useStorageStore, type FileAsset, type FilterType } from "@/store/storage-store"
import { useWorkspace } from "@/contexts/workspace-context"
import { StorageHeader } from "@/components/storage/StorageHeader"
import { FileGrid } from "@/components/storage/FileGrid"
import { FileList } from "@/components/storage/FileList"
import { FileUploader } from "@/components/storage/FileUploader"
import { FilePreviewModal } from "@/components/storage/FilePreviewModal"

function filterFiles(files: FileAsset[], type: FilterType, query: string) {
  let result = files
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
  const { files, setFiles, viewMode, filterType, searchQuery } = useStorageStore()
  const [loading, setLoading] = useState(true)
  const [uploaderOpen, setUploaderOpen] = useState(false)
  const [previewFile, setPreviewFile] = useState<FileAsset | null>(null)

  useEffect(() => {
    if (!activeWorkspaceId) return

    setLoading(true)
    fetch(`/api/storage/files`, {
      headers: { "x-workspace-id": activeWorkspaceId },
    })
      .then((r) => r.json())
      .then(({ files }) => setFiles(files ?? []))
      .catch(() => toast.error("Failed to load files"))
      .finally(() => setLoading(false))
  }, [activeWorkspaceId, setFiles])

  const visible = filterFiles(files, filterType, searchQuery)

  return (
    <div className="flex flex-col gap-6 p-6">
      <StorageHeader onUpload={() => setUploaderOpen(true)} totalFiles={files.length} />

      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 gap-4">
          {Array.from({ length: 10 }).map((_, i) => (
            <div key={i} className="rounded-xl border bg-muted/30 animate-pulse h-52" />
          ))}
        </div>
      ) : viewMode === "grid" ? (
        <FileGrid files={visible} onPreview={setPreviewFile} />
      ) : (
        <FileList files={visible} onPreview={setPreviewFile} />
      )}

      <FileUploader open={uploaderOpen} onClose={() => setUploaderOpen(false)} />
      <FilePreviewModal file={previewFile} onClose={() => setPreviewFile(null)} />
    </div>
  )
}
