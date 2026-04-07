import { create } from "zustand"

export interface FileAsset {
  _id: string
  name: string
  originalName: string
  publicId: string
  url: string
  resourceType: "image" | "raw"
  format: string
  size: number
  workspaceId: string
  uploadedBy: string
  createdAt: string
  updatedAt: string
}

export type FilterType = "all" | "image" | "raw"
export type ViewMode = "grid" | "list"

interface StorageState {
  files: FileAsset[]
  viewMode: ViewMode
  filterType: FilterType
  searchQuery: string
  isUploading: boolean
  uploadProgress: number

  setFiles: (files: FileAsset[]) => void
  addFile: (file: FileAsset) => void
  removeFile: (id: string) => void
  renameFile: (id: string, name: string) => void

  setViewMode: (mode: ViewMode) => void
  setFilterType: (type: FilterType) => void
  setSearchQuery: (q: string) => void
  setUploading: (uploading: boolean) => void
  setUploadProgress: (progress: number) => void
}

export const useStorageStore = create<StorageState>((set) => ({
  files: [],
  viewMode: "grid",
  filterType: "all",
  searchQuery: "",
  isUploading: false,
  uploadProgress: 0,

  setFiles: (files) => set({ files }),
  addFile: (file) => set((s) => ({ files: [file, ...s.files] })),
  removeFile: (id) => set((s) => ({ files: s.files.filter((f) => f._id !== id) })),
  renameFile: (id, name) =>
    set((s) => ({ files: s.files.map((f) => (f._id === id ? { ...f, name } : f)) })),

  setViewMode: (viewMode) => set({ viewMode }),
  setFilterType: (filterType) => set({ filterType }),
  setSearchQuery: (searchQuery) => set({ searchQuery }),
  setUploading: (isUploading) => set({ isUploading }),
  setUploadProgress: (uploadProgress) => set({ uploadProgress }),
}))
