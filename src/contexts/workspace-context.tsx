"use client"

import React, { createContext, useContext, useState, useEffect } from "react"
import { useSession } from "next-auth/react"

interface Workspace {
  _id: string;
  name: string;
  ownerId: string;
  members: Array<{ userId: string; role: string }>;
}

interface WorkspaceContextType {
  activeWorkspace: Workspace | null;
  workspaces: Workspace[];
  setActiveWorkspace: (workspace: Workspace) => void;
  isLoading: boolean;
}

const WorkspaceContext = createContext<WorkspaceContextType | undefined>(undefined)

export function WorkspaceProvider({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession()
  const [workspaces, setWorkspaces] = useState<Workspace[]>([])
  const [activeWorkspace, setActiveWorkspace] = useState<Workspace | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    async function fetchWorkspaces() {
      if (status !== "authenticated") {
        setWorkspaces([])
        setActiveWorkspace(null)
        if (status !== "loading") setIsLoading(false)
        return
      }

      try {
        const res = await fetch("/api/workspaces")
        if (res.ok) {
          const data = await res.json()
          setWorkspaces(data.workspaces)
          
          if (data.workspaces.length > 0) {
            // Restore from localStorage or default to first
            const savedId = localStorage.getItem("activeWorkspaceId")
            const saved = data.workspaces.find((w: Workspace) => w._id === savedId)
            setActiveWorkspace(saved || data.workspaces[0])
          } else {
            // Auto-create workspace if they have none
            const createRes = await fetch("/api/workspaces", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ name: "Personal Workspace" })
            })
            if (createRes.ok) {
               const createData = await createRes.json()
               setWorkspaces([createData.workspace])
               setActiveWorkspace(createData.workspace)
            }
          }
        }
      } catch (err) {
        console.error("Failed to load workspaces", err)
      } finally {
        setIsLoading(false)
      }
    }

    fetchWorkspaces()
  }, [status])

  useEffect(() => {
    if (activeWorkspace) {
      localStorage.setItem("activeWorkspaceId", activeWorkspace._id)
    }
  }, [activeWorkspace])

  return (
    <WorkspaceContext.Provider
      value={{
        activeWorkspace,
        workspaces,
        setActiveWorkspace,
        isLoading,
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
