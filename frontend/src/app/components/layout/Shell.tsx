import { useState } from "react";
import {
  LayoutDashboard,
  ListChecks,
  Download,
  Users,
  KeyRound,
  GraduationCap,
  UserCog,
  BookOpen,
  CalendarRange,
  LogOut,
  Menu,
  X,
} from "lucide-react";
import { cn } from "../ui/utils";
import type { NavKey, Role } from "../../lib/types";

interface NavItem {
  key: NavKey;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

const teacherNav: NavItem[] = [
  { key: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { key: "sessions", label: "Sessions", icon: ListChecks },
  { key: "export", label: "Export", icon: Download },
  { key: "students", label: "Students", icon: Users },
];

const adminNav: NavItem[] = [
  { key: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { key: "teachers", label: "Teachers", icon: GraduationCap },
  { key: "admins", label: "Admins", icon: UserCog },
  { key: "subjects", label: "Subjects", icon: BookOpen },
  { key: "schedule", label: "Schedule", icon: CalendarRange },
];

function Brand() {
  return (
    <div className="flex items-center">
      <span className="font-serif text-[1.08rem] text-foreground">Attendance</span>
    </div>
  );
}

function initials(name: string) {
  return name
    .replace(/(Dr\.|Prof\.)\s*/g, "")
    .split(" ")
    .map((n) => n[0])
    .slice(0, 2)
    .join("");
}

export function Shell({
  role,
  current,
  onNavigate,
  onLogout,
  userName,
  children,
  isSuperAdmin,
}: {
  role: Role;
  current: NavKey;
  onNavigate: (key: NavKey) => void;
  onLogout: () => void;
  userName: string;
  isSuperAdmin?: boolean;
  children: React.ReactNode;
}) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const nav = role === "teacher" ? teacherNav : adminNav;
  const allItems: NavItem[] = [...nav, { key: "password", label: "Password", icon: KeyRound }];

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-30 border-b border-border bg-[color-mix(in_srgb,var(--card)_88%,transparent)] backdrop-blur">
        <div className="mx-auto flex h-16 max-w-[1240px] items-center gap-6 px-5 sm:px-8">
          <Brand />

          <nav className="hidden flex-1 items-center gap-1 md:flex">
            {nav.map((item) => {
              const active = current === item.key;
              return (
                <button
                  key={item.key}
                  onClick={() => onNavigate(item.key)}
                  className={cn(
                    "relative rounded-md px-3 py-1.5 text-sm transition-colors",
                    active ? "text-foreground" : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  {item.label}
                  {active && <span className="absolute inset-x-3 -bottom-[21px] h-0.5 rounded-full bg-pop" />}
                </button>
              );
            })}
          </nav>

          <div className="ml-auto flex items-center gap-3">
            <span
              className={cn(
                "hidden items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs ring-1 ring-inset sm:inline-flex",
                role === "admin" ? "bg-blush/25 text-[#9c6650] ring-blush/40" : "bg-mint/30 text-[#3d6b4d] ring-mint/40"
              )}
            >
              {role === "admin" ? (isSuperAdmin ? "Super Admin" : "Administrator") : "Teacher"}
            </span>

            <div className="group relative hidden md:block">
              <button className="flex items-center gap-2 rounded-md py-1 pl-1 pr-2.5 transition-colors hover:bg-surface-2">
                <span className="grid size-8 place-items-center rounded-full bg-primary-soft text-xs text-[#51635a]">
                  {initials(userName)}
                </span>
                <span className="max-w-[120px] truncate text-sm">{userName}</span>
              </button>
              <div className="invisible absolute right-0 top-full w-48 translate-y-1 rounded-lg border border-border bg-card p-1.5 opacity-0 shadow-[0_12px_32px_-12px_rgba(42,41,37,0.18)] transition-all group-hover:visible group-hover:translate-y-2 group-hover:opacity-100">
                <button
                  onClick={() => onNavigate("password")}
                  className="flex w-full items-center gap-2.5 rounded-md px-3 py-2 text-left text-sm text-muted-foreground hover:bg-surface-2 hover:text-foreground"
                >
                  <KeyRound className="size-4" /> Change password
                </button>
                <button
                  onClick={onLogout}
                  className="flex w-full items-center gap-2.5 rounded-md px-3 py-2 text-left text-sm text-muted-foreground hover:bg-error/10 hover:text-[#a85a4c]"
                >
                  <LogOut className="size-4" /> Sign out
                </button>
              </div>
            </div>

            <button
              onClick={() => setMobileOpen((v) => !v)}
              className="grid size-9 place-items-center rounded-md border border-border text-muted-foreground md:hidden"
            >
              {mobileOpen ? <X className="size-5" /> : <Menu className="size-5" />}
            </button>
          </div>
        </div>

        {mobileOpen && (
          <div className="border-t border-border bg-card px-5 py-3 md:hidden">
            <div className="grid gap-1">
              {allItems.map((item) => {
                const Icon = item.icon;
                const active = current === item.key;
                return (
                  <button
                    key={item.key}
                    onClick={() => {
                      onNavigate(item.key);
                      setMobileOpen(false);
                    }}
                    className={cn(
                      "flex items-center gap-3 rounded-md px-3 py-2.5 text-left text-sm",
                      active ? "bg-primary-soft text-foreground" : "text-muted-foreground hover:bg-surface-2"
                    )}
                  >
                    <Icon className="size-[18px]" /> {item.label}
                  </button>
                );
              })}
              <button
                onClick={onLogout}
                className="mt-1 flex items-center gap-3 rounded-lg border-t border-border px-3 py-2.5 pt-3 text-left text-sm text-muted-foreground"
              >
                <LogOut className="size-[18px]" /> Sign out
              </button>
            </div>
          </div>
        )}
      </header>

      <main>
        <div className="mx-auto max-w-[1240px] px-5 py-8 sm:px-8 sm:py-10">{children}</div>
      </main>
    </div>
  );
}
