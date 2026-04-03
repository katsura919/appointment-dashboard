"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import { useAuthStore } from "@/store/auth-store";
import { useWorkspace } from "@/contexts/workspace-context";
import { CreateWorkspaceDialog } from "@/components/create-workspace-dialog";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  PlusIcon,
  LayoutDashboardIcon,
  UsersIcon,
  ArrowRightIcon,
  BuildingIcon,
  SparklesIcon,
  LogOutIcon,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface Workspace {
  _id: string;
  name: string;
  ownerId: string;
  members: Array<{ userId: string; role: string }>;
  createdAt?: string;
}

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
  // Pick a color based on name
  const colorIndex =
    workspace.name.charCodeAt(0) % colors.length;
  const gradient = colors[colorIndex];

  return (
    <button
      onClick={() => onSelect(workspace)}
      className="group relative flex flex-col gap-4 rounded-2xl border border-border bg-card p-6 text-left shadow-sm transition-all duration-200 hover:shadow-md hover:border-primary/30 hover:-translate-y-0.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
    >
      {/* Gradient avatar */}
      <div
        className={`flex size-14 items-center justify-center rounded-xl bg-gradient-to-br ${gradient} shadow-sm`}
      >
        <span className="text-2xl font-bold text-white">{initial}</span>
      </div>

      {/* Info */}
      <div className="flex-1">
        <h3 className="text-base font-semibold text-foreground group-hover:text-primary transition-colors">
          {workspace.name}
        </h3>
        <div className="mt-1 flex items-center gap-3 text-sm text-muted-foreground">
          <span className="flex items-center gap-1">
            <UsersIcon className="size-3.5" />
            {memberCount} {memberCount === 1 ? "member" : "members"}
          </span>
          {workspace.createdAt && (
            <span className="text-xs">
              Created{" "}
              {formatDistanceToNow(new Date(workspace.createdAt), {
                addSuffix: true,
              })}
            </span>
          )}
        </div>
      </div>

      {/* Arrow */}
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

function EmptyState({ onCreateClick }: { onCreateClick: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center gap-6 py-24 text-center">
      <div className="flex size-20 items-center justify-center rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 shadow-sm">
        <BuildingIcon className="size-10 text-primary" />
      </div>
      <div className="max-w-sm">
        <h2 className="text-2xl font-bold text-foreground">
          No workspaces yet
        </h2>
        <p className="mt-2 text-base text-muted-foreground">
          Create your first workspace to start organizing appointments for your
          family or team.
        </p>
      </div>
      <Button size="lg" onClick={onCreateClick} className="gap-2">
        <PlusIcon className="size-4" />
        Create your first workspace
      </Button>
    </div>
  );
}

export default function WorkspacesPage() {
  const router = useRouter();
  const { status } = useSession();
  const { isAuthenticated } = useAuthStore();
  const { workspaces, setActiveWorkspace, isLoading, refreshWorkspaces } =
    useWorkspace();
  const [createOpen, setCreateOpen] = React.useState(false);

  // Protect route
  React.useEffect(() => {
    const isUnauthenticated = status === "unauthenticated" && !isAuthenticated;
    if (isUnauthenticated) {
      // Break infinite loops: if client says we're unauthenticated but middleware proxy 
      // still sees a stale cookie, clear it so proxy allows access to /login.
      document.cookie = "auth-token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
      signOut({ redirect: false }).then(() => {
        router.push("/login");
      });
    }
  }, [status, isAuthenticated, router]);

  function handleSelectWorkspace(ws: Workspace) {
    setActiveWorkspace(ws);
    router.push("/dashboard");
  }

  // If loading, show skeleton grid
  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <PageHeader onCreateClick={() => {}} />
        <main className="mx-auto max-w-6xl px-6 py-10">
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
            <div className="mb-6 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-foreground">
                  Your Workspaces
                </h2>
                <p className="text-sm text-muted-foreground">
                  {workspaces.length} workspace
                  {workspaces.length !== 1 ? "s" : ""}
                </p>
              </div>
              <Button onClick={() => setCreateOpen(true)} className="gap-2" size="sm">
                <PlusIcon className="size-4" />
                New Workspace
              </Button>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {workspaces.map((ws) => (
                <WorkspaceCard
                  key={ws._id}
                  workspace={ws}
                  onSelect={handleSelectWorkspace}
                />
              ))}
              {/* Create new card */}
              <button
                onClick={() => setCreateOpen(true)}
                className="flex flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-border bg-transparent py-12 text-muted-foreground transition-all duration-200 hover:border-primary/40 hover:bg-primary/5 hover:text-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              >
                <div className="flex size-12 items-center justify-center rounded-xl border border-dashed border-current">
                  <PlusIcon className="size-6" />
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

function PageHeader({ onCreateClick }: { onCreateClick: () => void }) {
  const { clearAuth } = useAuthStore();
  const router = useRouter();

  const handleLogout = async () => {
    clearAuth();
    // Clear custom auth cookie if it exists
    document.cookie = "auth-token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
    await signOut({ redirect: false });
    router.push("/login");
  };

  return (
    <header className="border-b bg-card/50 backdrop-blur-sm">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <div className="flex items-center gap-3">
          <div className="flex size-8 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-primary/80">
            <SparklesIcon className="size-4 text-primary-foreground" />
          </div>
          <span className="text-lg font-semibold">Family Dashboard</span>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={onCreateClick} className="gap-2 border-primary/20 hover:border-primary/50">
            <PlusIcon className="size-4" />
            New Workspace
          </Button>
          <Button variant="ghost" size="icon" onClick={handleLogout} title="Log out">
            <LogOutIcon className="size-4 text-muted-foreground" />
          </Button>
        </div>
      </div>
    </header>
  );
}
