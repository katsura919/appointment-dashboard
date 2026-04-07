"use client"

import { SearchIcon, UploadIcon, LayoutGridIcon, ListIcon, FolderPlusIcon, ChevronRightIcon, HardDriveIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useStorageStore, type FilterType, type ViewMode, type StorageFolder } from "@/store/storage-store"

interface Props {
  onUpload: () => void
  onNewFolder: () => void
  totalFiles: number
  currentFolder: StorageFolder | null
  onGoRoot: () => void
}

const filterOptions: { label: string; value: FilterType }[] = [
  { label: "All", value: "all" },
  { label: "Images", value: "image" },
  { label: "Docs", value: "raw" },
]

export function StorageHeader({ onUpload, onNewFolder, totalFiles, currentFolder, onGoRoot }: Props) {
  const { searchQuery, filterType, viewMode, setSearchQuery, setFilterType, setViewMode } =
    useStorageStore()

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div className="flex flex-col gap-1">
          {/* Breadcrumb */}
          <div className="flex items-center gap-1 text-sm">
            <button
              onClick={onGoRoot}
              className={`flex items-center gap-1 transition-colors ${
                currentFolder
                  ? "text-muted-foreground hover:text-foreground"
                  : "text-foreground font-medium pointer-events-none"
              }`}
            >
              <HardDriveIcon className="size-3.5" />
              Storage
            </button>
            {currentFolder && (
              <>
                <ChevronRightIcon className="size-3.5 text-muted-foreground" />
                <span className="font-medium text-foreground">{currentFolder.name}</span>
              </>
            )}
          </div>
          <p className="text-xs text-muted-foreground">
            {currentFolder
              ? `${totalFiles} file${totalFiles !== 1 ? "s" : ""} in this folder`
              : `${totalFiles} file${totalFiles !== 1 ? "s" : ""} total`}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {!currentFolder && (
            <Button variant="outline" onClick={onNewFolder} className="gap-2">
              <FolderPlusIcon className="size-4" />
              New Folder
            </Button>
          )}
          <Button onClick={onUpload} className="gap-2">
            <UploadIcon className="size-4" />
            Upload
          </Button>
        </div>
      </div>

      <div className="flex items-center gap-3 flex-wrap">
        {/* Search */}
        <div className="relative flex-1 min-w-48 max-w-sm">
          <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            placeholder="Search files…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>

        {/* Type filter */}
        <Tabs value={filterType} onValueChange={(v) => setFilterType(v as FilterType)}>
          <TabsList>
            {filterOptions.map((opt) => (
              <TabsTrigger key={opt.value} value={opt.value}>
                {opt.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>

        {/* View toggle */}
        <div className="flex items-center border rounded-lg overflow-hidden">
          <Button
            variant={viewMode === "grid" ? "secondary" : "ghost"}
            size="icon"
            className="rounded-none h-9 w-9"
            onClick={() => setViewMode("grid")}
          >
            <LayoutGridIcon className="size-4" />
          </Button>
          <Button
            variant={viewMode === "list" ? "secondary" : "ghost"}
            size="icon"
            className="rounded-none h-9 w-9"
            onClick={() => setViewMode("list")}
          >
            <ListIcon className="size-4" />
          </Button>
        </div>
      </div>
    </div>
  )
}
