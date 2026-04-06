"use client"

import { useState } from "react"

import Link from "next/link"
import { MoreHorizontalIcon, ArchiveIcon, PencilIcon } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { NewProjectDialog } from "@/components/trello/NewProjectDialog"

export interface ProjectItem {
  _id: string
  name: string
  description?: string
  color?: string
  createdAt: string
}

interface Props {
  project: ProjectItem
  workspaceId: string
  onArchived: () => void
  onEdited: () => void
}

export function ProjectCard({ project, workspaceId, onArchived, onEdited }: Props) {
  const [editOpen, setEditOpen] = useState(false)

  async function handleArchive() {
    try {
      const res = await fetch(`/api/trello/projects/${project._id}`, {
        method: "DELETE",
        headers: { "x-workspace-id": workspaceId },
      })
      if (!res.ok) throw new Error()
      toast.success("Project archived")
      onArchived()
    } catch {
      toast.error("Failed to archive project")
    }
  }

  return (
    <>
      <div className="group relative rounded-xl border bg-card hover:shadow-md transition-shadow overflow-hidden">
        {/* Color bar */}
        <div className="h-2 w-full" style={{ backgroundColor: project.color ?? "#6366f1" }} />

        <div className="p-4">
          <div className="flex items-start justify-between gap-2">
            <Link
              href={`/projects/${project._id}`}
              className="flex-1 min-w-0"
            >
              <h3 className="font-semibold truncate hover:underline">{project.name}</h3>
              {project.description && (
                <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{project.description}</p>
              )}
            </Link>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-7 opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                >
                  <MoreHorizontalIcon className="size-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setEditOpen(true)}>
                  <PencilIcon className="size-4 mr-2" />
                  Edit
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="text-destructive focus:text-destructive"
                  onClick={handleArchive}
                >
                  <ArchiveIcon className="size-4 mr-2" />
                  Archive
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>

      <NewProjectDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        workspaceId={workspaceId}
        onSuccess={onEdited}
        editProjectId={project._id}
        initialValues={{
          name: project.name,
          description: project.description,
          color: project.color,
        }}
      />
    </>
  )
}
