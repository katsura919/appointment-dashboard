"use client";

import { useEffect, useState } from "react"

import { useRouter } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import { useAuthStore } from "@/store/auth-store";
import { useWorkspace } from "@/contexts/workspace-context";
import { CreateWorkspaceDialog } from "@/components/create-workspace-dialog";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  PlusIcon,
  LayoutDashboardIcon,
  UsersIcon,
  ArrowRightIcon,
  BuildingIcon,
  SparklesIcon,
  LogOutIcon,
  CircleUserRoundIcon,
  SettingsIcon,
  SunIcon,
  MoonIcon,
  Loader2Icon,
} from "lucide-react";
import { useTheme } from "next-themes";
import { formatDistanceToNow } from "date-fns";

interface Workspace {
  _id: string;
  name: string;
  timezone: string;
  ownerId: string;
  members: Array<{ userId: string; role: string }>;
  createdAt?: string;
}

// ── Workspace Card ────────────────────────────────────────────────────────────
function WorkspaceCard({
  workspace,
  onSelect,
}: {
  workspace: Workspace;
  onSelect: (ws: Workspace) => void;
}) {
  const initial = workspace.name.charAt(0).toUpperCase();
  const memberCount = workspace.members.length;

  const colors = [
    "from-violet-500 to-purple-600",
    "from-blue-500 to-cyan-600",
    "from-emerald-500 to-teal-600",
    "from-orange-500 to-rose-600",
    "from-pink-500 to-fuchsia-600",
    "from-amber-500 to-yellow-600",
  ];
  const gradient = colors[workspace.name.charCodeAt(0) % colors.length];

  return (
    <button
      onClick={() => onSelect(workspace)}
      className="group relative flex flex-col gap-4 rounded-2xl border border-border bg-card p-6 text-left shadow-sm transition-all duration-200 hover:shadow-md hover:border-primary/30 hover:-translate-y-0.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary cursor-pointer"
    >
      <div className={`flex size-12 items-center justify-center rounded-xl bg-gradient-to-br ${gradient} shadow-sm`}>
        <span className="text-xl font-bold text-white">{initial}</span>
      </div>

      <div className="flex-1">
        <h3 className="text-base font-semibold text-foreground group-hover:text-primary transition-colors">
          {workspace.name}
        </h3>
        <div className="mt-1.5 flex items-center gap-3 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <UsersIcon className="size-3.5" />
            {memberCount} {memberCount === 1 ? "member" : "members"}
          </span>
          {workspace.createdAt && (
            <span>
              {formatDistanceToNow(new Date(workspace.createdAt), { addSuffix: true })}
            </span>
          )}
        </div>
      </div>

      <div className="flex items-center justify-between">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
          <LayoutDashboardIcon className="size-3" />
          Open Dashboard
        </span>
        <ArrowRightIcon className="size-4 text-muted-foreground opacity-0 transition-all group-hover:opacity-100 group-hover:translate-x-0.5" />
      </div>
    </button>
  );
}

// ── Empty State ───────────────────────────────────────────────────────────────
function EmptyState({ onCreateClick }: { onCreateClick: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center gap-6 py-24 text-center">
      <div className="flex size-20 items-center justify-center rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 shadow-sm">
        <BuildingIcon className="size-10 text-primary" />
      </div>
      <div className="max-w-sm">
        <h2 className="text-2xl font-bold text-foreground">No workspaces yet</h2>
        <p className="mt-2 text-base text-muted-foreground">
          Create your first workspace to start organizing appointments for your family or team.
        </p>
      </div>
      <Button size="lg" onClick={onCreateClick} className="gap-2">
        <PlusIcon className="size-4" />
        Create your first workspace
      </Button>
    </div>
  );
}

// ── Page Header ───────────────────────────────────────────────────────────────
function PageHeader({ onCreateClick }: { onCreateClick: () => void }) {
  const router = useRouter();
  const { data: session } = useSession();
  const { resolvedTheme, setTheme } = useTheme();
  const { clearAuth } = useAuthStore();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const name = session?.user?.name ?? "User";
  const email = session?.user?.email ?? "";
  const avatar = session?.user?.image ?? "";
  const initials = name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  const handleLogout = async () => {
    setIsLoggingOut(true);
    clearAuth();
    document.cookie = "auth-token=; path=/; max-age=0";
    await signOut({ redirect: false });
    window.location.href = "/login";
  };

  if (isLoggingOut) {
    return (
      <div className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-3 bg-background">
        <Loader2Icon className="size-8 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">Signing out...</p>
      </div>
    );
  }

  return (
    <header className="sticky top-0 z-10 border-b bg-background/80 backdrop-blur-sm">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3">
        {/* Logo */}
        <div className="flex items-center gap-2.5">
          <div className="flex size-8 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-primary/80">
            <SparklesIcon className="size-4 text-primary-foreground" />
          </div>
          <span className="text-base font-semibold tracking-tight">Minesha</span>
        </div>

        {/* Right side */}
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={onCreateClick}
            className="gap-1.5 hidden sm:inline-flex cursor-pointer"
          >
            <PlusIcon className="size-3.5" />
            New Workspace
          </Button>

          {/* Avatar dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2">
                <Avatar className="size-8 cursor-pointer">
                  <AvatarImage src={avatar} alt={name} />
                  <AvatarFallback className="text-xs font-semibold bg-primary/10 text-primary">
                    {initials}
                  </AvatarFallback>
                </Avatar>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56 rounded-xl" align="end" sideOffset={8}>
              <DropdownMenuLabel className="p-0 font-normal">
                <div className="flex items-center gap-2.5 px-3 py-2.5">
                  <Avatar className="size-8">
                    <AvatarImage src={avatar} alt={name} />
                    <AvatarFallback className="text-xs font-semibold bg-primary/10 text-primary">
                      {initials}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex flex-col min-w-0">
                    <span className="truncate text-sm font-medium">{name}</span>
                    <span className="truncate text-xs text-muted-foreground">{email}</span>
                  </div>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuGroup>
                <DropdownMenuItem className="gap-2 cursor-pointer">
                  <CircleUserRoundIcon className="size-4" />
                  Account
                </DropdownMenuItem>
                <DropdownMenuItem className="gap-2 cursor-pointer" onClick={() => router.push("/settings")}>
                  <SettingsIcon className="size-4" />
                  Settings
                </DropdownMenuItem>
                <DropdownMenuItem
                  className="gap-2 cursor-pointer"
                  onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
                >
                  {resolvedTheme === "dark" ? (
                    <SunIcon className="size-4" />
                  ) : (
                    <MoonIcon className="size-4" />
                  )}
                  {resolvedTheme === "dark" ? "Light mode" : "Dark mode"}
                </DropdownMenuItem>
              </DropdownMenuGroup>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="gap-2 cursor-pointer text-destructive focus:text-destructive"
                onClick={handleLogout}
              >
                <LogOutIcon className="size-4" />
                Log out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function WorkspacesPage() {
  const router = useRouter();
  const { status } = useSession();
  const { data: session } = useSession();
  const { isAuthenticated } = useAuthStore();
  const { workspaces, setActiveWorkspace, isLoading, refreshWorkspaces } = useWorkspace();
  const [createOpen, setCreateOpen] = useState(false);

  const firstName = session?.user?.name?.split(" ")[0] ?? "there";

  useEffect(() => {
    const isUnauthenticated = status === "unauthenticated" && !isAuthenticated;
    if (isUnauthenticated) {
      window.location.href = "/login";
    }
  }, [status, isAuthenticated, router]);

  function handleSelectWorkspace(ws: Workspace) {
    setActiveWorkspace(ws);
    router.push("/dashboard");
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <PageHeader onCreateClick={() => {}} />
        <main className="mx-auto max-w-6xl px-6 py-10">
          <Skeleton className="h-7 w-48 mb-1" />
          <Skeleton className="h-4 w-64 mb-8" />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[...Array(3)].map((_, i) => (
              <Skeleton key={i} className="h-48 w-full rounded-2xl" />
            ))}
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <PageHeader onCreateClick={() => setCreateOpen(true)} />

      <main className="mx-auto max-w-6xl px-6 py-10">
        {workspaces.length === 0 ? (
          <EmptyState onCreateClick={() => setCreateOpen(true)} />
        ) : (
          <>
            {/* Section header */}
            <div className="mb-8">
              <h2 className="text-xl font-semibold text-foreground">
                Welcome back, {firstName}
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                {workspaces.length} workspace{workspaces.length !== 1 ? "s" : ""} — pick one to continue
              </p>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {workspaces.map((ws) => (
                <WorkspaceCard
                  key={ws._id}
                  workspace={ws}
                  onSelect={handleSelectWorkspace}
                />
              ))}
              {/* Create new tile */}
              <button
                onClick={() => setCreateOpen(true)}
                className="flex flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-border bg-transparent py-12 text-muted-foreground transition-all duration-200 hover:border-primary/40 hover:bg-primary/5 hover:text-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-primary cursor-pointer"
              >
                <div className="flex size-12 items-center justify-center rounded-xl border border-dashed border-current">
                  <PlusIcon className="size-5" />
                </div>
                <span className="text-sm font-medium">New Workspace</span>
              </button>
            </div>
          </>
        )}
      </main>

      <CreateWorkspaceDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onSuccess={(ws) => {
          setActiveWorkspace(ws);
          router.push("/dashboard");
        }}
      />
    </div>
  );
}
