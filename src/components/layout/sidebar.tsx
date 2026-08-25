"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import {
  LayoutDashboard, Network, ClipboardList, BarChart3, Bell,
  Users, Settings, ChevronsLeft, ChevronsRight, Zap, HardHat,
  LogOut, UserCircle, ChevronUp,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";

interface NavItem  { label: string; href: string; icon: React.ElementType }
interface NavGroup { title: string; items: NavItem[] }

const adminNavGroups: NavGroup[] = [
  { title: "Overview",        items: [{ label: "Dashboard",      href: "/admin",               icon: LayoutDashboard }] },
  { title: "Network",         items: [{ label: "Hierarchy",      href: "/admin/hierarchy",      icon: Network         }] },
  { title: "Operations",      items: [{ label: "Job Cards",      href: "/admin/job-cards",      icon: ClipboardList   }] },
  { title: "Insights",        items: [
    { label: "Reports",       href: "/admin/reports",       icon: BarChart3 },
    { label: "Notifications", href: "/admin/notifications", icon: Bell      },
  ]},
  { title: "Administration",  items: [
    { label: "Users",         href: "/admin/users",         icon: Users    },
    { label: "Settings",      href: "/admin/settings",      icon: Settings },
  ]},
];

const aeNavGroups: NavGroup[] = [
  { title: "Overview",   items: [{ label: "Dashboard",     href: "/ae",               icon: LayoutDashboard }] },
  { title: "Operations", items: [{ label: "Job Cards",     href: "/ae/job-cards",     icon: ClipboardList   }] },
  { title: "Insights",   items: [{ label: "Notifications", href: "/ae/notifications", icon: Bell            }] },
];

const seNavGroups: NavGroup[] = [
  { title: "Overview",   items: [{ label: "Dashboard", href: "/se",           icon: LayoutDashboard }] },
  { title: "Operations", items: [{ label: "My Jobs",   href: "/se/job-cards", icon: HardHat         }] },
];

export interface SidebarUser {
  name: string;
  email: string;
  role: string;
  profileHref: string;
}

export function Sidebar({
  variant = "admin",
  badges = {},
  user,
}: {
  variant?: "admin" | "ae" | "se";
  badges?: Record<string, number>;
  user?: SidebarUser;
}) {
  const pathname = usePathname();
  const router   = useRouter();
  const [collapsed, setCollapsed] = React.useState(false);

  const navGroups = variant === "admin" ? adminNavGroups : variant === "ae" ? aeNavGroups : seNavGroups;
  const basePath  = variant === "admin" ? "/admin" : variant === "ae" ? "/ae" : "/se";

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  const displayName = user?.name && !user.name.includes("@") ? user.name : (user?.email ?? "User");
  const displayEmail = user?.email ?? (user?.name?.includes("@") ? user.name : "");
  const initials = displayName.split(" ").map((n) => n[0]).filter(Boolean).slice(0, 2).join("").toUpperCase() || "U";

  return (
    <aside className={cn(
      "hidden lg:flex flex-col shrink-0 h-screen sticky top-0 border-r border-border bg-sidebar transition-all duration-200",
      collapsed ? "w-[72px]" : "w-[240px]"
    )}>
      {/* Logo */}
      <div className="flex items-center h-16 shrink-0 px-4 border-b border-border">
        <div className="flex items-center gap-2.5 overflow-hidden">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-accent text-white">
            <Zap className="h-4 w-4" strokeWidth={2.25} />
          </div>
          {!collapsed && (
            <div className="flex flex-col leading-none animate-fade-in">
              <span className="text-sm font-semibold text-foreground">KTPCL SIMMS</span>
              <span className="text-[11px] text-foreground-secondary mt-0.5">Spectrum Consultants</span>
            </div>
          )}
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-5">
        {navGroups.map((group) => (
          <div key={group.title}>
            {!collapsed && (
              <p className="px-2.5 mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                {group.title}
              </p>
            )}
            <div className="space-y-0.5">
              {group.items.map((item) => {
                const active = item.href === basePath ? pathname === basePath : pathname.startsWith(item.href);
                const Icon   = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    title={collapsed ? item.label : undefined}
                    className={cn(
                      "group flex items-center gap-3 rounded-[10px] px-2.5 py-2 text-sm font-medium transition-colors",
                      active
                        ? "bg-blue-50 text-accent"
                        : "text-foreground-secondary hover:bg-hover hover:text-foreground"
                    )}
                  >
                    <Icon className={cn("h-[18px] w-[18px] shrink-0", active ? "text-accent" : "text-slate-400 group-hover:text-foreground-secondary")} />
                    {!collapsed && <span className="flex-1 truncate">{item.label}</span>}
                    {!collapsed && badges[item.href] ? (
                      <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-accent px-1 text-[11px] font-semibold text-white">
                        {badges[item.href]}
                      </span>
                    ) : null}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* User profile at bottom */}
      <div className="border-t border-border p-3 space-y-1">
        {user && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                className={cn(
                  "flex w-full items-center rounded-[10px] px-2 py-2 text-sm hover:bg-hover transition-colors gap-2.5",
                  collapsed ? "justify-center" : ""
                )}
              >
                {/* Avatar */}
                <div className="h-8 w-8 shrink-0 rounded-full bg-accent/10 border border-accent/20 flex items-center justify-center text-accent font-semibold text-[13px]">
                  {initials}
                </div>
                {!collapsed && (
                  <>
                    <div className="flex-1 min-w-0 text-left">
                      <p className="text-sm font-medium text-foreground truncate leading-tight">{displayName}</p>
                      <p className="text-[11px] text-foreground-secondary truncate">{user.role}</p>
                    </div>
                    <ChevronUp className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                  </>
                )}
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent side="top" align={collapsed ? "center" : "end"} className="w-56 mb-1">
              <DropdownMenuLabel className="py-2">
                <p className="font-medium text-foreground">{displayName}</p>
                {displayEmail && <p className="text-[11px] text-foreground-secondary font-normal truncate mt-0.5">{displayEmail}</p>}
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="gap-2 cursor-pointer" onClick={() => router.push(user.profileHref)}>
                <UserCircle className="h-4 w-4 shrink-0" />
                <span>Profile</span>
              </DropdownMenuItem>
              {variant === "admin" && (
                <DropdownMenuItem className="gap-2 cursor-pointer" onClick={() => router.push("/admin/settings")}>
                  <Settings className="h-4 w-4 shrink-0" />
                  <span>Settings</span>
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem className="gap-2 text-danger focus:bg-red-50 cursor-pointer" onClick={handleSignOut}>
                <LogOut className="h-4 w-4 shrink-0" />
                <span>Sign out</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}

        {/* Collapse toggle */}
        <button
          onClick={() => setCollapsed((c) => !c)}
          className="flex w-full items-center justify-center gap-2 rounded-[10px] px-2.5 py-1.5 text-xs font-medium text-foreground-secondary hover:bg-hover hover:text-foreground transition-colors"
        >
          {collapsed ? <ChevronsRight className="h-4 w-4" /> : <><ChevronsLeft className="h-4 w-4" /><span>Collapse</span></>}
        </button>
      </div>
    </aside>
  );
}
