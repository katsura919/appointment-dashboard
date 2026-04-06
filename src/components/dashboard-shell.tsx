"use client";

import { CSSProperties, ReactNode, useEffect } from "react"

import { useRouter } from "next/navigation"
import { AppSidebar } from "@/components/app-sidebar"
import { SiteHeader } from "@/components/site-header"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"
import { useWorkspace } from "@/contexts/workspace-context"
import { FullPageLoader } from "@/components/full-page-loader"

export function DashboardShell({
  title,
  children,
}: {
  title: string
  children: ReactNode
}) {
  const router = useRouter()
  const { activeWorkspace, isLoading } = useWorkspace()

  // Redirect to workspaces overview if loaded and no workspace is available
  useEffect(() => {
    if (!isLoading && !activeWorkspace) {
      router.push("/workspaces")
    }
  }, [isLoading, activeWorkspace, router])

  // Show a full-page loader while checking context or if we are about to redirect
  if (isLoading || (!isLoading && !activeWorkspace)) {
    return <FullPageLoader />
  }

  return (
    <SidebarProvider
      style={
        {
          "--sidebar-width": "calc(var(--spacing) * 72)",
          "--header-height": "calc(var(--spacing) * 12)",
        } as CSSProperties
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
