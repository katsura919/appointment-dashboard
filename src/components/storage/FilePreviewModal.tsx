"use client"

import { DownloadIcon, XIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import type { FileAsset } from "@/store/storage-store"

interface Props {
  file: FileAsset | null
  onClose: () => void
}

export function FilePreviewModal({ file, onClose }: Props) {
  if (!file) return null

  const isImage = file.resourceType === "image"
  const isPdf = file.format === "pdf"

  return (
    <Dialog open={!!file} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl w-full h-[80vh] flex flex-col p-0 gap-0">
        <DialogHeader className="px-4 py-3 border-b flex-row items-center justify-between space-y-0">
          <DialogTitle className="text-sm font-medium truncate max-w-md">{file.name}</DialogTitle>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" asChild>
              <a href={file.url} download={file.name} target="_blank" rel="noopener noreferrer">
                <DownloadIcon className="size-4 mr-1.5" /> Download
              </a>
            </Button>
            <Button variant="ghost" size="icon" className="size-8" onClick={onClose}>
              <XIcon className="size-4" />
            </Button>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-hidden bg-muted/20 flex items-center justify-center">
          {isImage && (
            <img
              src={file.url}
              alt={file.name}
              className="max-w-full max-h-full object-contain"
            />
          )}

          {isPdf && (
            <embed
              src={file.url}
              type="application/pdf"
              className="w-full h-full"
            />
          )}

          {!isImage && !isPdf && (
            <div className="text-center text-muted-foreground p-8">
              <p className="font-medium mb-2">Preview not available</p>
              <p className="text-sm mb-4">
                {file.format.toUpperCase()} files cannot be previewed in the browser.
              </p>
              <Button asChild>
                <a href={file.url} download={file.name} target="_blank" rel="noopener noreferrer">
                  <DownloadIcon className="size-4 mr-2" /> Download to view
                </a>
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
