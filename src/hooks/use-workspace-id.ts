"use client"

import { useWorkspace } from "@/contexts/workspace-context"

/**
 * Returns the active workspace ID string, or null if no workspace is selected yet.
 * Drop-in replacement for useUserId() in data-fetching contexts.
 */
export function useWorkspaceId(): string | null {
  const { activeWorkspace } = useWorkspace()
  return activeWorkspace?._id ?? null
}
