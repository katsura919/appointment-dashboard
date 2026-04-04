"use client"

import * as React from "react"
import { PlusIcon } from "lucide-react"
import { DashboardShell } from "@/components/dashboard-shell"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { ProjectCard, type ProjectItem } from "@/components/trello/ProjectCard"
import { NewProjectDialog } from "@/components/trello/NewProjectDialog"
import { useWorkspaceId } from "@/hooks/use-workspace-id"

export default function ProjectsPage() {
  const workspaceId = useWorkspaceId()
  const [projects, setProjects] = React.useState<ProjectItem[]>([])
  const [loading, setLoading] = React.useState(true)
  const [dialogOpen, setDialogOpen] = React.useState(false)

  const fetchProjects = React.useCallback(async () => {
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

  React.useEffect(() => {
    fetchProjects()
  }, [fetchProjects])

  return (
    <DashboardShell title="Projects">
      <div className="flex flex-col gap-6 py-4 px-4 lg:px-6 md:py-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold">Projects</h1>
            <p className="text-sm text-muted-foreground">
              Manage your workspace boards and pipelines
            </p>
          </div>
          <Button onClick={() => setDialogOpen(true)} disabled={!workspaceId}>
            <PlusIcon className="size-4" />
            New Project
          </Button>
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
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {projects.map((project) => (
              <ProjectCard
                key={project._id}
                project={project}
                workspaceId={workspaceId!}
                onArchived={fetchProjects}
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
