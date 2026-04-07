"use client"

import type { FileAsset } from "@/store/storage-store"
import { FileCard } from "./FileCard"

interface Props {
  files: FileAsset[]
  onPreview: (file: FileAsset) => void
}

export function FileGrid({ files, onPreview }: Props) {
  if (files.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center text-muted-foreground">
        <p className="text-base font-medium">No files yet</p>
        <p className="text-sm mt-1">Upload files using the button above</p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 gap-4">
      {files.map((file) => (
        <FileCard key={file._id} file={file} onPreview={onPreview} />
      ))}
    </div>
  )
}
