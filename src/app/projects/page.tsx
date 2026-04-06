"use client"

import { useCallback, useEffect, useMemo, useState } from "react"

import { PlusIcon, SearchIcon } from "lucide-react"
import { DashboardShell } from "@/components/dashboard-shell"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { ProjectCard, type ProjectItem } from "@/components/trello/ProjectCard"
import { NewProjectDialog } from "@/components/trello/NewProjectDialog"
import { useWorkspaceId } from "@/hooks/use-workspace-id"

export default function ProjectsPage() {
  const workspaceId = useWorkspaceId()
  const [projects, setProjects] = useState<ProjectItem[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [query, setQuery] = useState("")

  const filteredProjects = useMemo(
    () => projects.filter((p) => p.name.toLowerCase().includes(query.toLowerCase())),
    [projects, query]
  )

  const fetchProjects = useCallback(async () => {
    if (!workspaceId) return
    setLoading(true)
    try {
      const res = await fetch("/api/trello/projects", {
        headers: { "x-workspace-id": workspaceId },
      })
      const data = await res.json()
      setProjects(data.projects ?? [])
    } catch {
      // silently fail
    } finally {
      setLoading(false)
    }
  }, [workspaceId])

  useEffect(() => {
    fetchProjects()
  }, [fetchProjects])

  return (
    <DashboardShell title="Projects">
      <div className="flex flex-col gap-6 py-4 px-4 lg:px-6 md:py-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-semibold">Projects</h1>
            <p className="text-sm text-muted-foreground">
              Manage your workspace boards and pipelines
            </p>
          </div>
          <div className="flex items-center gap-2 ml-auto">
            {projects.length > 0 && (
              <div className="relative">
                <SearchIcon className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
                <Input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search projects..."
                  className="pl-8 h-9 w-48 text-sm"
                />
              </div>
            )}
            <Button onClick={() => setDialogOpen(true)} disabled={!workspaceId}>
              <PlusIcon className="size-4" />
              New Project
            </Button>
          </div>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-28 w-full rounded-xl" />
            ))}
          </div>
        ) : projects.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3 text-center">
            <div className="size-14 rounded-full bg-muted flex items-center justify-center">
              <PlusIcon className="size-6 text-muted-foreground" />
            </div>
            <p className="font-medium">No projects yet</p>
            <p className="text-sm text-muted-foreground">
              Create your first project to start organizing tasks
            </p>
            <Button onClick={() => setDialogOpen(true)}>
              <PlusIcon className="size-4" />
              New Project
            </Button>
          </div>
        ) : filteredProjects.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 gap-2 text-center">
            <p className="font-medium text-muted-foreground">No projects match &ldquo;{query}&rdquo;</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredProjects.map((project) => (
              <ProjectCard
                key={project._id}
                project={project}
                workspaceId={workspaceId!}
                onArchived={fetchProjects}
                onEdited={fetchProjects}
              />
            ))}
          </div>
        )}
      </div>

      {workspaceId && (
        <NewProjectDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          workspaceId={workspaceId}
          onSuccess={fetchProjects}
        />
      )}
    </DashboardShell>
  )
}
