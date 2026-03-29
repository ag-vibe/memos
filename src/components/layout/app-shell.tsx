import { useState } from "react";
import { Avatar, Button, Dropdown, Label } from "@heroui/react";
import { Archive, Home, Moon, Sun, LogOut, Settings, Menu, X } from "lucide-react";
import { useIsAuthenticated, useSession, signOut } from "@/lib/auth-store";
import type { TagSummary, MemoSummary } from "@/api-gen/types.gen";
import { ActivityGraph } from "@/components/memo/activity-graph";

interface AppShellProps {
  tags?: TagSummary[];
  allMemos?: MemoSummary[];
  totalMemosCount?: number;
  activeTag?: string;
  onTagSelect?: (tag: string | undefined) => void;
  activeView?: "all" | "archived";
  onViewChange?: (view: "all" | "archived") => void;
  children: React.ReactNode;
}

function ThemeToggle() {
  const [theme, setTheme] = useState<"light" | "dark">(() => {
    const stored = typeof window !== "undefined" ? localStorage.getItem("theme") : null;
    if (stored === "light" || stored === "dark") return stored;
    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  });

  function toggle() {
    const next = theme === "light" ? "dark" : "light";
    setTheme(next);
    localStorage.setItem("theme", next);
    document.documentElement.classList.remove("light", "dark");
    document.documentElement.classList.add(next);
    document.documentElement.setAttribute("data-theme", next);
    document.documentElement.style.colorScheme = next;
  }

  return (
    <Button variant="ghost" isIconOnly onPress={toggle} aria-label="Toggle theme" size="sm">
      {theme === "light" ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
    </Button>
  );
}

function UserMenu() {
  const session = useSession();
  const initials = session ? session.accessToken.slice(0, 2).toUpperCase() : "??";

  return (
    <Dropdown>
      <Avatar size="sm" className="cursor-pointer">
        <Avatar.Fallback>{initials}</Avatar.Fallback>
      </Avatar>
      <Dropdown.Popover>
        <Dropdown.Menu
          onAction={(key) => {
            if (key === "signout") signOut();
          }}
        >
          <Dropdown.Item id="settings" textValue="Settings">
            <Settings className="w-4 h-4 mr-2 inline" />
            <Label>Settings</Label>
          </Dropdown.Item>
          <Dropdown.Item id="signout" textValue="Sign out" variant="danger">
            <LogOut className="w-4 h-4 mr-2 inline" />
            <Label>Sign out</Label>
          </Dropdown.Item>
        </Dropdown.Menu>
      </Dropdown.Popover>
    </Dropdown>
  );
}

function SidebarContent({
  tags,
  allMemos,
  totalMemosCount,
  activeTag,
  onTagSelect,
  activeView,
  onViewChange,
  onClose,
}: Omit<AppShellProps, "children"> & { onClose?: () => void }) {
  const navItems = [
    { id: "all", label: "All Memos", icon: Home, view: "all" as const },
    { id: "archived", label: "Archived", icon: Archive, view: "archived" as const },
  ];

  return (
    <div className="flex flex-col h-full gap-4 p-4">
      {/* Logo */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5 px-1">
          <img src="/logo512.png" alt="in-memo" className="w-7 h-7 rounded-lg" />
          <span className="font-semibold text-sm tracking-tight text-foreground">in-memo</span>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="lg:hidden p-1 rounded-lg text-foreground/50 hover:text-foreground hover:bg-foreground/5 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Nav */}
      <nav className="flex flex-col gap-0.5">
        {navItems.map((item) => (
          <button
            key={item.id}
            onClick={() => {
              onViewChange?.(item.view);
              onTagSelect?.(undefined);
              onClose?.();
            }}
            className={[
              "flex items-center gap-2 px-2 py-1.5 rounded-lg text-sm font-medium transition-colors w-full text-left",
              activeView === item.view && !activeTag
                ? "bg-foreground/8 text-foreground"
                : "text-foreground/55 hover:text-foreground hover:bg-foreground/5",
            ].join(" ")}
          >
            <item.icon className="w-3.5 h-3.5 flex-shrink-0" />
            {item.label}
          </button>
        ))}
      </nav>

      {/* Activity graph */}
      <div className="rounded-xl border border-foreground/10 bg-background p-3">
        <ActivityGraph memos={allMemos ?? []} />
      </div>

      {/* Tags */}
      {tags && tags.length > 0 && (
        <div>
          <div className="text-xs font-medium text-foreground/40 uppercase tracking-wider px-2 mb-1.5">
            Tags
          </div>
          <div className="flex flex-col gap-0.5">
            <button
              onClick={() => {
                onTagSelect?.(undefined);
                onClose?.();
              }}
              className={[
                "flex items-center justify-between px-2 py-1.5 rounded-lg text-sm transition-colors",
                !activeTag
                  ? "bg-accent/10 text-accent"
                  : "text-foreground/60 hover:text-foreground hover:bg-foreground/5",
              ].join(" ")}
            >
              <span>All</span>
              <span className="text-xs opacity-60">{totalMemosCount}</span>
            </button>
            {tags.map((tag) => (
              <button
                key={tag.name}
                onClick={() => {
                  onTagSelect?.(activeTag === tag.name ? undefined : tag.name);
                  onClose?.();
                }}
                className={[
                  "flex items-center justify-between px-2 py-1.5 rounded-lg text-sm transition-colors",
                  activeTag === tag.name
                    ? "bg-accent/10 text-accent"
                    : "text-foreground/60 hover:text-foreground hover:bg-foreground/5",
                ].join(" ")}
              >
                <span>#{tag.name}</span>
                <span className="text-xs opacity-60">{tag.count}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Spacer */}
      <div className="flex-1" />

      {/* Bottom actions */}
      <div className="flex items-center justify-between px-1">
        <UserMenu />
        <ThemeToggle />
      </div>
    </div>
  );
}

export function AppShell({
  children,
  tags,
  allMemos = [],
  totalMemosCount = 0,
  activeTag,
  onTagSelect,
  activeView = "all",
  onViewChange,
}: AppShellProps) {
  const isAuthenticated = useIsAuthenticated();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  if (!isAuthenticated) return <>{children}</>;

  const sidebarProps = {
    tags,
    allMemos,
    totalMemosCount,
    activeTag,
    onTagSelect,
    activeView,
    onViewChange,
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Mobile overlay backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Mobile sidebar — slides in from left */}
      <aside
        className={[
          "fixed top-0 left-0 z-50 h-full w-64 bg-background border-r border-foreground/8 shadow-xl transition-transform duration-300 ease-in-out lg:hidden",
          sidebarOpen ? "translate-x-0" : "-translate-x-full",
        ].join(" ")}
      >
        <SidebarContent {...sidebarProps} onClose={() => setSidebarOpen(false)} />
      </aside>

      {/* Centered two-column layout */}
      <main className="max-w-6xl mx-auto px-4 lg:px-6 flex gap-6 min-h-screen">
        {/* Desktop left sidebar */}
        <aside className="hidden lg:flex flex-col w-56 xl:w-64 flex-shrink-0 sticky top-0 self-start min-h-screen">
          <SidebarContent {...sidebarProps} />
        </aside>

        {/* Right content */}
        <div className="flex-1 min-w-0 flex flex-col">
          {/* Mobile top bar — just logo + hamburger */}
          <div className="lg:hidden flex items-center gap-3 py-4">
            <button
              onClick={() => setSidebarOpen(true)}
              className="p-1.5 rounded-lg text-foreground/60 hover:text-foreground hover:bg-foreground/5 transition-colors"
              aria-label="Open sidebar"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-2">
              <img src="/logo512.png" alt="in-memo" className="w-6 h-6 rounded-md" />
              <span className="font-semibold text-sm tracking-tight text-foreground">in-memo</span>
            </div>
          </div>
          {children}
        </div>
      </main>
    </div>
  );
}
