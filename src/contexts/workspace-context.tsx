"use client"

import React, { createContext, useContext, useState, useEffect, useCallback } from "react"
import { useSession } from "next-auth/react"
import { useAuthStore } from "@/store/auth-store"

interface Workspace {
  _id: string;
  name: string;
  timezone: string;
  ownerId: string;
  members: Array<{ userId: string; role: string }>;
  createdAt?: string;
}

interface WorkspaceContextType {
  activeWorkspace: Workspace | null;
  workspaces: Workspace[];
  setActiveWorkspace: (workspace: Workspace) => void;
  isLoading: boolean;
  refreshWorkspaces: () => Promise<void>;
}

const WorkspaceContext = createContext<WorkspaceContextType | undefined>(undefined)

export function WorkspaceProvider({ children }: { children: React.ReactNode }) {
  const { status } = useSession()
  const { isAuthenticated } = useAuthStore()
  const [workspaces, setWorkspaces] = useState<Workspace[]>([])
  const [activeWorkspace, setActiveWorkspaceState] = useState<Workspace | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const fetchWorkspaces = useCallback(async () => {
    // Check if either NextAuth or Zustand says we are authenticated
    const isReady = status === "authenticated" || isAuthenticated;
    const isStillLoading = status === "loading";

    if (!isReady) {
      setWorkspaces([])
      setActiveWorkspaceState(null)
      if (!isStillLoading) setIsLoading(false)
      return
    }

    setIsLoading(true)
    try {
      const res = await fetch("/api/workspaces")
      if (res.ok) {
        const data = await res.json()
        const fetched: Workspace[] = data.workspaces ?? []
        setWorkspaces(fetched)

        if (fetched.length > 0) {
          // Restore from localStorage or default to first
          const savedId = localStorage.getItem("activeWorkspaceId")
          const saved = fetched.find((w) => w._id === savedId)
          setActiveWorkspaceState((prev) => {
            // If the currently active workspace is still in the list, keep it
            if (prev && fetched.find((w) => w._id === prev._id)) return prev
            return saved || fetched[0]
          })
        } else {
          setActiveWorkspaceState(null)
        }
      }
    } catch (err) {
      console.error("Failed to load workspaces", err)
    } finally {
      setIsLoading(false)
    }
  }, [status, isAuthenticated])

  useEffect(() => {
    fetchWorkspaces()
  }, [fetchWorkspaces])

  function setActiveWorkspace(workspace: Workspace) {
    setActiveWorkspaceState(workspace)
    localStorage.setItem("activeWorkspaceId", workspace._id)
  }

  return (
    <WorkspaceContext.Provider
      value={{
        activeWorkspace,
        workspaces,
        setActiveWorkspace,
        isLoading,
        refreshWorkspaces: fetchWorkspaces,
      }}
    >
      {children}
    </WorkspaceContext.Provider>
  )
}

export function useWorkspace() {
  const context = useContext(WorkspaceContext)
  if (context === undefined) {
    throw new Error("useWorkspace must be used within a WorkspaceProvider")
  }
  return context
}
