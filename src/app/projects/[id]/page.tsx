"use client"

import { useCallback, useEffect, useMemo, useState } from "react"

import { useParams } from "next/navigation"
import Link from "next/link"
import { ChevronLeftIcon, XIcon, ArchiveIcon, RotateCcwIcon } from "lucide-react"
import { DashboardShell } from "@/components/dashboard-shell"
import { TrelloBoard, type BoardFilters } from "@/components/trello/TrelloBoard"
import { Skeleton } from "@/components/ui/skeleton"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
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

  const [project, setProject] = useState<ProjectMeta | null>(null)
  const [boardData, setBoardData] = useState<BoardApiResponse | null>(null)
  // initialLoad controls the full-page skeleton; subsequent refreshes are silent
  const [initialLoad, setInitialLoad] = useState(true)
  const [filters, setFilters] = useState<BoardFilters>({
    priority: "",
    activeLabels: [],
    activeAssignees: [],
    dueSoon: false,
  })
  const [showArchived, setShowArchived] = useState(false)
  const [archivedData, setArchivedData] = useState<BoardApiResponse | null>(null)
  const [archivedLoading, setArchivedLoading] = useState(false)
  const [restoringId, setRestoringId] = useState<string | null>(null)

  const fetchBoard = useCallback(async (silent = false) => {
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

  useEffect(() => {
    fetchBoard(false)
  }, [fetchBoard])

  const fetchArchived = useCallback(async () => {
    if (!id) return
    setArchivedLoading(true)
    try {
      const res = await fetch(`/api/trello/projects/${id}/board?archived=true`)
      if (!res.ok) return
      const data = await res.json()
      setArchivedData({ pipelines: data.pipelines, cards: data.cards })
    } catch {
      // silently fail
    } finally {
      setArchivedLoading(false)
    }
  }, [id])

  useEffect(() => {
    if (showArchived) fetchArchived()
  }, [showArchived, fetchArchived])

  async function handleRestore(type: "card" | "pipeline", itemId: string, workspaceId: string) {
    setRestoringId(itemId)
    try {
      const url =
        type === "card"
          ? `/api/trello/cards/${itemId}`
          : `/api/trello/pipelines/${itemId}`
      const res = await fetch(url, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", "x-workspace-id": workspaceId },
        body: JSON.stringify({ restore: true }),
      })
      if (!res.ok) throw new Error()
      await fetchArchived()
      fetchBoard(true)
    } catch {
      // silently fail
    } finally {
      setRestoringId(null)
    }
  }

  const title = project?.name ?? "Board"

  // Derive unique labels and assignees from current board data for the filter bar
  const { uniqueLabels, uniqueAssignees } = useMemo(() => {
    if (!boardData) return { uniqueLabels: [], uniqueAssignees: [] }
    const labelSet = new Map<string, string>() // text -> color
    const assigneeMap = new Map<string, { id: string; name: string }>()
    for (const card of boardData.cards) {
      for (const label of card.labels ?? []) {
        if (!labelSet.has(label.text)) labelSet.set(label.text, label.color)
      }
      for (const a of (card.assigneeIds as unknown as { _id: string; name: string }[]) ?? []) {
        if (!assigneeMap.has(a._id)) assigneeMap.set(a._id, { id: a._id, name: a.name })
      }
    }
    return {
      uniqueLabels: Array.from(labelSet.entries()).map(([text, color]) => ({ text, color })),
      uniqueAssignees: Array.from(assigneeMap.values()),
    }
  }, [boardData])

  const hasActiveFilters =
    filters.priority || filters.activeLabels.length > 0 || filters.activeAssignees.length > 0 || filters.dueSoon

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
          <div className="ml-auto">
            <Button
              variant={showArchived ? "default" : "outline"}
              size="sm"
              className="h-7 text-xs gap-1.5"
              onClick={() => setShowArchived((v) => !v)}
            >
              <ArchiveIcon className="size-3.5" />
              {showArchived ? "Hide Archived" : "Archived"}
            </Button>
          </div>
        </div>

        {/* Filter bar */}
        {!initialLoad && boardData && (
          <div className="flex items-center gap-2 flex-wrap">
            {/* Priority filter */}
            <Select
              value={filters.priority || "all"}
              onValueChange={(v) => setFilters((f) => ({ ...f, priority: v === "all" ? "" : v }))}
            >
              <SelectTrigger className="h-7 w-36 text-xs">
                <SelectValue placeholder="Priority" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All priorities</SelectItem>
                <SelectItem value="urgent">🔴 Urgent</SelectItem>
                <SelectItem value="high">🟠 High</SelectItem>
                <SelectItem value="medium">🟡 Medium</SelectItem>
                <SelectItem value="low">⚪ Low</SelectItem>
              </SelectContent>
            </Select>

            {/* Due soon toggle */}
            <Button
              variant={filters.dueSoon ? "default" : "outline"}
              size="sm"
              className="h-7 text-xs"
              onClick={() => setFilters((f) => ({ ...f, dueSoon: !f.dueSoon }))}
            >
              Overdue
            </Button>

            {/* Label filters */}
            {uniqueLabels.map((label) => {
              const active = filters.activeLabels.includes(label.text)
              return (
                <button
                  key={label.text}
                  onClick={() =>
                    setFilters((f) => ({
                      ...f,
                      activeLabels: active
                        ? f.activeLabels.filter((l) => l !== label.text)
                        : [...f.activeLabels, label.text],
                    }))
                  }
                  className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium text-white border-2 transition-all cursor-pointer ${
                    active ? "border-white/60 scale-105" : "border-transparent opacity-70 hover:opacity-100"
                  }`}
                  style={{ backgroundColor: label.color }}
                >
                  {label.text}
                </button>
              )
            })}

            {/* Assignee filters */}
            {uniqueAssignees.map((member) => {
              const active = filters.activeAssignees.includes(member.id)
              return (
                <button
                  key={member.id}
                  title={member.name}
                  onClick={() =>
                    setFilters((f) => ({
                      ...f,
                      activeAssignees: active
                        ? f.activeAssignees.filter((id) => id !== member.id)
                        : [...f.activeAssignees, member.id],
                    }))
                  }
                  className={`size-7 rounded-full bg-primary/20 flex items-center justify-center text-[11px] font-semibold uppercase transition-all cursor-pointer ${
                    active ? "ring-2 ring-primary ring-offset-1 scale-110" : "opacity-70 hover:opacity-100"
                  }`}
                >
                  {member.name[0]}
                </button>
              )
            })}

            {/* Clear filters */}
            {hasActiveFilters && (
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-xs text-muted-foreground"
                onClick={() =>
                  setFilters({ priority: "", activeLabels: [], activeAssignees: [], dueSoon: false })
                }
              >
                <XIcon className="size-3 mr-1" />
                Clear
              </Button>
            )}
          </div>
        )}

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
            filters={filters}
          />
        )}
        {/* Archived items panel */}
        {showArchived && (
          <div className="border rounded-xl bg-muted/20 p-4 space-y-4">
            <h3 className="text-sm font-semibold flex items-center gap-2">
              <ArchiveIcon className="size-4" />
              Archived Items
            </h3>
            {archivedLoading ? (
              <p className="text-sm text-muted-foreground">Loading...</p>
            ) : !archivedData ||
              (archivedData.pipelines.length === 0 && archivedData.cards.length === 0) ? (
              <p className="text-sm text-muted-foreground">No archived items.</p>
            ) : (
              <div className="space-y-3">
                {archivedData.pipelines.length > 0 && (
                  <div className="space-y-1">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Pipelines
                    </p>
                    {archivedData.pipelines.map((p) => (
                      <div
                        key={(p as unknown as { _id: string })._id}
                        className="flex items-center justify-between px-3 py-2 rounded-lg bg-card border text-sm"
                      >
                        <span className="font-medium">{p.name}</span>
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-7 text-xs gap-1"
                          disabled={restoringId === (p as unknown as { _id: string })._id}
                          onClick={() =>
                            handleRestore(
                              "pipeline",
                              (p as unknown as { _id: string })._id,
                              p.workspaceId.toString()
                            )
                          }
                        >
                          <RotateCcwIcon className="size-3" />
                          Restore
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
                {archivedData.cards.length > 0 && (
                  <div className="space-y-1">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Cards
                    </p>
                    {archivedData.cards.map((c) => (
                      <div
                        key={(c as unknown as { _id: string })._id}
                        className="flex items-center justify-between px-3 py-2 rounded-lg bg-card border text-sm"
                      >
                        <span className="font-medium">{c.title}</span>
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-7 text-xs gap-1"
                          disabled={restoringId === (c as unknown as { _id: string })._id}
                          onClick={() =>
                            handleRestore(
                              "card",
                              (c as unknown as { _id: string })._id,
                              c.workspaceId.toString()
                            )
                          }
                        >
                          <RotateCcwIcon className="size-3" />
                          Restore
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </DashboardShell>
  )
}
