"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  MapPin,
  Building2,
  Boxes,
  Cpu,
  PuzzleIcon,
  ClipboardList,
  Wrench,
  CalendarClock,
  BarChart3,
  Bell,
  Users,
  Settings,
  ChevronsLeft,
  ChevronsRight,
  Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface NavItem {
  label: string;
  href: string;
  icon: React.ElementType;
  badge?: number;
}

interface NavGroup {
  title: string;
  items: NavItem[];
}

const adminNavGroups: NavGroup[] = [
  {
    title: "Overview",
    items: [{ label: "Dashboard", href: "/admin", icon: LayoutDashboard }],
  },
  {
    title: "Network",
    items: [
      { label: "Regions", href: "/admin/regions", icon: MapPin },
      { label: "Substations", href: "/admin/substations", icon: Building2 },
    ],
  },
  {
    title: "Assets",
    items: [
      { label: "Inventory", href: "/admin/inventory", icon: Boxes },
      { label: "Equipment", href: "/admin/equipment", icon: Cpu },
      { label: "Components", href: "/admin/components", icon: PuzzleIcon },
    ],
  },
  {
    title: "Operations",
    items: [
      { label: "Job Cards", href: "/admin/job-cards", icon: ClipboardList },
      { label: "Service Requests", href: "/admin/service-requests", icon: Wrench },
      { label: "Preventive Maintenance", href: "/admin/maintenance", icon: CalendarClock },
    ],
  },
  {
    title: "Insights",
    items: [
      { label: "Reports", href: "/admin/reports", icon: BarChart3 },
      { label: "Notifications", href: "/admin/notifications", icon: Bell },
    ],
  },
  {
    title: "Administration",
    items: [
      { label: "Users", href: "/admin/users", icon: Users },
      { label: "Settings", href: "/admin/settings", icon: Settings },
    ],
  },
];

const aeNavGroups: NavGroup[] = [
  {
    title: "Overview",
    items: [{ label: "Dashboard", href: "/ae", icon: LayoutDashboard }],
  },
  {
    title: "My Substation",
    items: [
      { label: "Inventory", href: "/ae/inventory", icon: Boxes },
      { label: "Equipment", href: "/ae/equipment", icon: Cpu },
    ],
  },
  {
    title: "Operations",
    items: [
      { label: "Job Cards", href: "/ae/job-cards", icon: ClipboardList },
      { label: "Service Requests", href: "/ae/service-requests", icon: Wrench },
    ],
  },
  {
    title: "Insights",
    items: [{ label: "Notifications", href: "/ae/notifications", icon: Bell }],
  },
];

export function Sidebar({ variant = "admin" }: { variant?: "admin" | "ae" }) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = React.useState(false);
  const navGroups = variant === "admin" ? adminNavGroups : aeNavGroups;
  const basePath = variant === "admin" ? "/admin" : "/ae";

  return (
    <aside
      className={cn(
        "hidden lg:flex flex-col shrink-0 h-screen sticky top-0 border-r border-border bg-sidebar transition-all duration-200",
        collapsed ? "w-[76px]" : "w-[264px]"
      )}
    >
      <div className="flex items-center h-16 shrink-0 px-4 border-b border-border">
        <div className="flex items-center gap-2.5 overflow-hidden">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-accent text-white">
            <Zap className="h-4.5 w-4.5" strokeWidth={2.25} />
          </div>
          {!collapsed && (
            <div className="flex flex-col leading-none animate-fade-in">
              <span className="text-sm font-semibold text-foreground">KTPCL SIMMS</span>
              <span className="text-[11px] text-foreground-secondary mt-0.5">Spectrum Consultants</span>
            </div>
          )}
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-6">
        {navGroups.map((group) => (
          <div key={group.title}>
            {!collapsed && (
              <p className="px-2.5 mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                {group.title}
              </p>
            )}
            <div className="space-y-0.5">
              {group.items.map((item) => {
                const active =
                  item.href === basePath ? pathname === basePath : pathname.startsWith(item.href);
                const Icon = item.icon;
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
                    {!collapsed && item.badge ? (
                      <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-accent px-1 text-[11px] font-semibold text-white">
                        {item.badge}
                      </span>
                    ) : null}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      <div className="border-t border-border p-3">
        <button
          onClick={() => setCollapsed((c) => !c)}
          className="flex w-full items-center justify-center gap-2 rounded-[10px] px-2.5 py-2 text-xs font-medium text-foreground-secondary hover:bg-hover hover:text-foreground transition-colors"
        >
          {collapsed ? <ChevronsRight className="h-4 w-4" /> : <><ChevronsLeft className="h-4 w-4" /> Collapse</>}
        </button>
      </div>
    </aside>
  );
}
