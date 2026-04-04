"use client"

import * as React from "react"
import { useParams } from "next/navigation"
import Link from "next/link"
import { ChevronLeftIcon } from "lucide-react"
import { DashboardShell } from "@/components/dashboard-shell"
import { TrelloBoard } from "@/components/trello/TrelloBoard"
import { Skeleton } from "@/components/ui/skeleton"
import { Button } from "@/components/ui/button"
import { useWorkspaceId } from "@/hooks/use-workspace-id"
import type { BoardApiResponse } from "@/lib/trello/boardTransformer"

interface ProjectMeta {
  _id: string
  name: string
  color?: string
  description?: string
}

export default function BoardPage() {
  const { id } = useParams<{ id: string }>()
  const workspaceId = useWorkspaceId()

  const [project, setProject] = React.useState<ProjectMeta | null>(null)
  const [boardData, setBoardData] = React.useState<BoardApiResponse | null>(null)
  // initialLoad controls the full-page skeleton; subsequent refreshes are silent
  const [initialLoad, setInitialLoad] = React.useState(true)

  const fetchBoard = React.useCallback(async (silent = false) => {
    if (!id) return
    if (!silent) setInitialLoad(true)
    try {
      const res = await fetch(`/api/trello/projects/${id}/board`)
      if (!res.ok) return
      const data = await res.json()
      if (!data.pipelines || !data.cards) return
      setProject(data.project)
      setBoardData({ pipelines: data.pipelines, cards: data.cards })
    } catch {
      // silently fail
    } finally {
      if (!silent) setInitialLoad(false)
    }
  }, [id])

  React.useEffect(() => {
    fetchBoard(false)
  }, [fetchBoard])

  const title = project?.name ?? "Board"

  return (
    <DashboardShell title={title}>
      <div className="flex flex-col gap-3 py-4 px-4 lg:px-6">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" asChild className="h-7 px-2">
            <Link href="/projects">
              <ChevronLeftIcon className="size-4" />
              Projects
            </Link>
          </Button>
          {project && (
            <>
              <span className="text-muted-foreground">/</span>
              <span className="text-sm font-medium">{project.name}</span>
              {project.color && (
                <span
                  className="size-3 rounded-full inline-block"
                  style={{ backgroundColor: project.color }}
                />
              )}
            </>
          )}
        </div>

        {initialLoad || !boardData || !workspaceId ? (
          <div className="flex gap-4 overflow-x-auto pb-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="w-64 shrink-0 space-y-3">
                <Skeleton className="h-8 w-full rounded-lg" />
                {[1, 2, 3].map((j) => (
                  <Skeleton key={j} className="h-20 w-full rounded-lg" />
                ))}
              </div>
            ))}
          </div>
        ) : (
          <TrelloBoard
            projectId={id}
            workspaceId={workspaceId}
            apiData={boardData}
            onBoardChanged={fetchBoard}
          />
        )}
      </div>
    </DashboardShell>
  )
}
