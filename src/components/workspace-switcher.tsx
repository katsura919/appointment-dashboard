"use client"

import * as React from "react"
import { ChevronsUpDown, Plus, Settings2, Home } from "lucide-react"
import Link from "next/link"

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar"
import { useWorkspace } from "@/contexts/workspace-context"
import { CreateWorkspaceDialog } from "@/components/create-workspace-dialog"

export function WorkspaceSwitcher() {
  const { isMobile } = useSidebar()
  const { workspaces, activeWorkspace, setActiveWorkspace } = useWorkspace()
  const [createOpen, setCreateOpen] = React.useState(false)

  if (!activeWorkspace) return null

  return (
    <>
      <SidebarMenu>
        <SidebarMenuItem>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <SidebarMenuButton
                size="lg"
                className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
              >
                <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
                  <span className="font-bold text-lg">{activeWorkspace.name.charAt(0).toUpperCase()}</span>
                </div>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-semibold">
                    {activeWorkspace.name}
                  </span>
                  <span className="truncate text-xs">Workspace</span>
                </div>
                <ChevronsUpDown className="ml-auto" />
              </SidebarMenuButton>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              className="w-[--radix-dropdown-menu-trigger-width] min-w-56 rounded-lg"
              align="start"
              side={isMobile ? "bottom" : "right"}
              sideOffset={4}
            >
              <DropdownMenuItem asChild className="gap-2 p-2 cursor-pointer">
                <Link href="/workspaces">
                  <div className="flex size-6 items-center justify-center rounded-md border bg-background">
                    <Home className="size-4" />
                  </div>
                  <div className="font-medium">Home</div>
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuLabel className="text-xs text-muted-foreground">
                Workspaces
              </DropdownMenuLabel>
              {workspaces.map((ws, index) => (
                <DropdownMenuItem
                  key={ws._id}
                  onClick={() => setActiveWorkspace(ws)}
                  className="gap-2 p-2 cursor-pointer"
                >
                  <div className="flex size-6 items-center justify-center rounded-sm border">
                    {ws.name.charAt(0).toUpperCase()}
                  </div>
                  {ws.name}
                  <DropdownMenuShortcut>⌘{index + 1}</DropdownMenuShortcut>
                </DropdownMenuItem>
              ))}
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="gap-2 p-2 cursor-pointer"
                onClick={() => setCreateOpen(true)}
              >
                <div className="flex size-6 items-center justify-center rounded-md border bg-background">
                  <Plus className="size-4" />
                </div>
                <div className="font-medium text-muted-foreground">Add workspace</div>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild className="gap-2 p-2 cursor-pointer">
                <Link href="/settings">
                  <div className="flex size-6 items-center justify-center rounded-md border bg-background">
                    <Settings2 className="size-4" />
                  </div>
                  <div className="font-medium text-muted-foreground">Workspace settings</div>
                </Link>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </SidebarMenuItem>
      </SidebarMenu>

      <CreateWorkspaceDialog open={createOpen} onOpenChange={setCreateOpen} />
    </>
  )
}
