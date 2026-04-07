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
  folderId?: string | null
  createdAt: string
  updatedAt: string
}

export interface StorageFolder {
  _id: string
  name: string
  workspaceId: string
  createdBy: string
  createdAt: string
  updatedAt: string
}

export type FilterType = "all" | "image" | "raw"
export type ViewMode = "grid" | "list"

interface StorageState {
  files: FileAsset[]
  folders: StorageFolder[]
  currentFolderId: string | null
  viewMode: ViewMode
  filterType: FilterType
  searchQuery: string
  isUploading: boolean
  uploadProgress: number

  setFiles: (files: FileAsset[]) => void
  addFile: (file: FileAsset) => void
  removeFile: (id: string) => void
  renameFile: (id: string, name: string) => void
  moveFile: (fileId: string, folderId: string | null) => void

  setFolders: (folders: StorageFolder[]) => void
  addFolder: (folder: StorageFolder) => void
  removeFolder: (id: string) => void
  renameFolder: (id: string, name: string) => void

  setCurrentFolderId: (id: string | null) => void
  setViewMode: (mode: ViewMode) => void
  setFilterType: (type: FilterType) => void
  setSearchQuery: (q: string) => void
  setUploading: (uploading: boolean) => void
  setUploadProgress: (progress: number) => void
}

export const useStorageStore = create<StorageState>((set) => ({
  files: [],
  folders: [],
  currentFolderId: null,
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
  moveFile: (fileId, folderId) =>
    set((s) => ({
      files: s.files.map((f) => (f._id === fileId ? { ...f, folderId } : f)),
    })),

  setFolders: (folders) => set({ folders }),
  addFolder: (folder) => set((s) => ({ folders: [folder, ...s.folders] })),
  removeFolder: (id) =>
    set((s) => ({
      folders: s.folders.filter((f) => f._id !== id),
      // Move orphaned files to root in local state
      files: s.files.map((f) => (f.folderId === id ? { ...f, folderId: null } : f)),
    })),
  renameFolder: (id, name) =>
    set((s) => ({ folders: s.folders.map((f) => (f._id === id ? { ...f, name } : f)) })),

  setCurrentFolderId: (currentFolderId) => set({ currentFolderId, searchQuery: "" }),
  setViewMode: (viewMode) => set({ viewMode }),
  setFilterType: (filterType) => set({ filterType }),
  setSearchQuery: (searchQuery) => set({ searchQuery }),
  setUploading: (isUploading) => set({ isUploading }),
  setUploadProgress: (uploadProgress) => set({ uploadProgress }),
}))
