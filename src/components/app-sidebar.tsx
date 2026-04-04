"use client"

import * as React from "react"
import Link from "next/link"

import { NavMain } from "@/components/nav-main"
import { NavSecondary } from "@/components/nav-secondary"
import { NavUser } from "@/components/nav-user"
import { WorkspaceSwitcher } from "@/components/workspace-switcher"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"
import {
  LayoutDashboardIcon,
  CalendarIcon,
  UsersIcon,
  Settings2Icon,
  CircleHelpIcon,
  HeartIcon,
  StethoscopeIcon,
  BookOpenIcon,
  TrophyIcon,
  CarIcon,
  FileTextIcon,
  SparklesIcon,
  CommandIcon,
  ActivityIcon,
  KanbanIcon,
} from "lucide-react"
import { useAuthStore } from "@/store/auth-store"
import { useSession } from "next-auth/react"

const navMain = [
  { title: "Dashboard", url: "/dashboard", icon: <LayoutDashboardIcon /> },
  { title: "Appointments", url: "/appointments", icon: <CalendarIcon /> },
  { title: "Family Members", url: "/family", icon: <UsersIcon /> },
  { title: "Well-Being", url: "/well-being", icon: <ActivityIcon /> },
  { title: "Projects", url: "/projects", icon: <KanbanIcon /> },
]

const navSecondary = [
  { title: "Settings", url: "/settings", icon: <Settings2Icon /> },
  { title: "Get Help", url: "#", icon: <CircleHelpIcon /> },
]

const categories = [
  {
    title: "Health & Wellness",
    url: "/appointments?category=health_wellness",
    dot: "bg-blue-500",
    icon: <StethoscopeIcon className="size-4" />,
  },
  {
    title: "Education & Development",
    url: "/appointments?category=education_development",
    dot: "bg-purple-500",
    icon: <BookOpenIcon className="size-4" />,
  },
  {
    title: "Activities & Enrichment",
    url: "/appointments?category=activities_enrichment",
    dot: "bg-green-500",
    icon: <TrophyIcon className="size-4" />,
  },
  {
    title: "Life Logistics",
    url: "/appointments?category=life_logistics",
    dot: "bg-orange-500",
    icon: <CarIcon className="size-4" />,
  },
  {
    title: "Family & Relationships",
    url: "/appointments?category=family_relationship",
    dot: "bg-rose-500",
    icon: <HeartIcon className="size-4" />,
  },
  {
    title: "Administrative",
    url: "/appointments?category=administrative",
    dot: "bg-slate-500",
    icon: <FileTextIcon className="size-4" />,
  },
  {
    title: "Mom's Personal Care",
    url: "/appointments?category=mom_personal_care",
    dot: "bg-teal-500",
    icon: <SparklesIcon className="size-4" />,
  },
]

const FALLBACK_USER = { name: "User", email: "", avatar: "" }

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const storeUser = useAuthStore((s) => s.user)
  const { data: session } = useSession()

  const sidebarUser = storeUser
    ? { name: storeUser.name, email: storeUser.email, avatar: "" }
    : session?.user
      ? {
          name: session.user.name ?? "User",
          email: session.user.email ?? "",
          avatar: session.user.image ?? "",
        }
      : FALLBACK_USER

  return (
    <Sidebar collapsible="offcanvas" {...props}>
      <SidebarHeader>
        <WorkspaceSwitcher />
      </SidebarHeader>

      <SidebarContent>
        <NavMain items={navMain} />

        <SidebarGroup>
          <SidebarGroupLabel>Categories</SidebarGroupLabel>
          <SidebarMenu>
            {categories.map((cat) => (
              <SidebarMenuItem key={cat.title}>
                <SidebarMenuButton
                  tooltip={cat.title}
                  asChild
                >
                  <Link href={cat.url}>
                    <span className={`size-2 rounded-full shrink-0 ${cat.dot}`} />
                    <span className="truncate">{cat.title}</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
        </SidebarGroup>

        <NavSecondary items={navSecondary} className="mt-auto" />
      </SidebarContent>

      <SidebarFooter>
        <NavUser user={sidebarUser} />
      </SidebarFooter>
    </Sidebar>
  )
}
