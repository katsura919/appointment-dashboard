"use client";

import * as React from "react"
import { useRouter } from "next/navigation"
import { AppSidebar } from "@/components/app-sidebar"
import { SiteHeader } from "@/components/site-header"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"
import { useWorkspace } from "@/contexts/workspace-context"
import { Skeleton } from "@/components/ui/skeleton"

export function DashboardShell({
  title,
  children,
}: {
  title: string
  children: React.ReactNode
}) {
  const router = useRouter()
  const { activeWorkspace, isLoading } = useWorkspace()

  // Redirect to workspaces overview if loaded and no workspace is available
  React.useEffect(() => {
    if (!isLoading && !activeWorkspace) {
      router.push("/workspaces")
    }
  }, [isLoading, activeWorkspace, router])

  // Show a loading skeleton while checking context or if we are about to redirect
  if (isLoading || (!isLoading && !activeWorkspace)) {
    return (
      <SidebarProvider
        style={
          {
            "--sidebar-width": "calc(var(--spacing) * 72)",
            "--header-height": "calc(var(--spacing) * 12)",
          } as React.CSSProperties
        }
      >
        <AppSidebar variant="inset" />
        <SidebarInset>
          <SiteHeader title={title} />
          <div className="flex flex-1 flex-col p-6 items-center justify-center">
            <Skeleton className="h-10 w-48 mb-4 rounded-lg" />
            <div className="text-muted-foreground text-sm">Loading workspace...</div>
          </div>
        </SidebarInset>
      </SidebarProvider>
    )
  }

  return (
    <SidebarProvider
      style={
        {
          "--sidebar-width": "calc(var(--spacing) * 72)",
          "--header-height": "calc(var(--spacing) * 12)",
        } as React.CSSProperties
      }
    >
      <AppSidebar variant="inset" />
      <SidebarInset>
        <SiteHeader title={title} />
        <div className="flex flex-1 flex-col">
          <div className="@container/main flex flex-1 flex-col gap-2">
            {children}
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
