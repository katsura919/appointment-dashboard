"use client"

import { useCallback, useState } from "react"
import { useDropzone, type FileRejection } from "react-dropzone"
import { toast } from "sonner"
import { UploadCloudIcon, XIcon, FileIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Progress } from "@/components/ui/progress"
import { useStorageStore } from "@/store/storage-store"
import { useWorkspace } from "@/contexts/workspace-context"

const MAX_SIZE = 5 * 1024 * 1024 // 5 MB

const ALLOWED_MIME: Record<string, string[]> = {
  "image/jpeg": [".jpg", ".jpeg"],
  "image/png": [".png"],
  "image/gif": [".gif"],
  "image/webp": [".webp"],
  "image/svg+xml": [".svg"],
  "application/pdf": [".pdf"],
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": [".docx"],
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [".xlsx"],
  "text/csv": [".csv"],
  "text/plain": [".txt"],
}

const IMAGE_MIMES = new Set(["image/jpeg", "image/png", "image/gif", "image/webp", "image/svg+xml"])

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

interface Props {
  open: boolean
  onClose: () => void
}

interface PendingFile {
  file: File
  id: string
}

export function FileUploader({ open, onClose }: Props) {
  const { activeWorkspace } = useWorkspace()
  const activeWorkspaceId = activeWorkspace?._id
  const { addFile, setUploading, setUploadProgress, uploadProgress, currentFolderId } = useStorageStore()
  const [pending, setPending] = useState<PendingFile[]>([])
  const [uploading, setLocalUploading] = useState(false)

  const onDrop = useCallback((accepted: File[], rejected: FileRejection[]) => {
    if (rejected.length > 0) {
      rejected.forEach(({ file, errors }) => {
        if (errors.some((e) => e.code === "file-too-large")) {
          toast.error(`${file.name} exceeds the 5 MB limit`)
        } else if (errors.some((e) => e.code === "file-invalid-type")) {
          toast.error(`${file.name} is not an allowed file type`)
        }
      })
    }
    if (accepted.length > 0) {
      setPending((prev) => [
        ...prev,
        ...accepted.map((f) => ({ file: f, id: crypto.randomUUID() })),
      ])
    }
  }, [])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: ALLOWED_MIME,
    maxSize: MAX_SIZE,
    multiple: true,
  })

  function removePending(id: string) {
    setPending((prev) => prev.filter((p) => p.id !== id))
  }

  async function uploadAll() {
    if (!activeWorkspaceId || pending.length === 0) return
    setLocalUploading(true)
    setUploading(true)

    let completed = 0

    for (const { file } of pending) {
      try {
        const resourceType = IMAGE_MIMES.has(file.type) ? "image" : "raw"

        // 1. Get signature from our API
        const signRes = await fetch("/api/storage/sign", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-workspace-id": activeWorkspaceId,
          },
          body: JSON.stringify({ resourceType }),
        })

        if (!signRes.ok) throw new Error("Failed to get upload signature")
        const { signature, timestamp, folder, apiKey, cloudName } = await signRes.json()

        // 2. Upload directly to Cloudinary
        const formData = new FormData()
        formData.append("file", file)
        formData.append("api_key", apiKey)
        formData.append("timestamp", String(timestamp))
        formData.append("signature", signature)
        formData.append("folder", folder)

        const uploadUrl = `https://api.cloudinary.com/v1_1/${cloudName}/${resourceType}/upload`
        const cloudRes = await fetch(uploadUrl, { method: "POST", body: formData })

        if (!cloudRes.ok) throw new Error("Cloudinary upload failed")
        const cloudData = await cloudRes.json()

        // 3. Save metadata to our DB
        const ext = file.name.split(".").pop()?.toLowerCase() ?? ""
        const saveRes = await fetch("/api/storage/files", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-workspace-id": activeWorkspaceId,
          },
          body: JSON.stringify({
            name: file.name,
            originalName: file.name,
            publicId: cloudData.public_id,
            url: cloudData.secure_url,
            resourceType,
            format: cloudData.format ?? ext,
            size: file.size,
            folderId: currentFolderId ?? null,
          }),
        })

        if (!saveRes.ok) throw new Error("Failed to save file metadata")
        const { file: saved } = await saveRes.json()

        addFile(saved)
        toast.success(`${file.name} uploaded`)
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Upload failed"
        toast.error(`${file.name}: ${msg}`)
      }

      completed++
      setUploadProgress(Math.round((completed / pending.length) * 100))
    }

    setLocalUploading(false)
    setUploading(false)
    setUploadProgress(0)
    setPending([])
    onClose()
  }

  function handleClose() {
    if (uploading) return
    setPending([])
    onClose()
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Upload Files</DialogTitle>
        </DialogHeader>

        <div
          {...getRootProps()}
          className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors ${
            isDragActive
              ? "border-primary bg-primary/5"
              : "border-muted-foreground/30 hover:border-primary/50"
          }`}
        >
          <input {...getInputProps()} />
          <UploadCloudIcon className="mx-auto size-10 text-muted-foreground mb-3" />
          <p className="text-sm font-medium">
            {isDragActive ? "Drop files here" : "Drag & drop or click to select"}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            Images, PDF, DOCX, XLSX, CSV, TXT · Max 5 MB each
          </p>
        </div>

        {pending.length > 0 && (
          <ul className="space-y-2 max-h-48 overflow-y-auto">
            {pending.map(({ file, id }) => (
              <li key={id} className="flex items-center gap-3 text-sm">
                <FileIcon className="size-4 shrink-0 text-muted-foreground" />
                <span className="flex-1 truncate">{file.name}</span>
                <span className="text-muted-foreground shrink-0">{formatBytes(file.size)}</span>
                {!uploading && (
                  <button onClick={() => removePending(id)} className="text-muted-foreground hover:text-foreground">
                    <XIcon className="size-4" />
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}

        {uploading && <Progress value={uploadProgress} className="h-1.5" />}

        <div className="flex justify-end gap-2 pt-1">
          <Button variant="ghost" onClick={handleClose} disabled={uploading}>
            Cancel
          </Button>
          <Button onClick={uploadAll} disabled={uploading || pending.length === 0}>
            {uploading ? "Uploading…" : `Upload ${pending.length > 0 ? `(${pending.length})` : ""}`}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
