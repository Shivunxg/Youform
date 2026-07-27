"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Search, Bell, ChevronDown, LogOut, Settings, UserCircle } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { NotificationsPanel } from "@/components/layout/notifications-panel";
import { createClient } from "@/lib/supabase/client";
import type { DbNotification } from "@/lib/supabase/types";

export function Header({
  role = "Spectrum Admin",
  name = "Arjun Mehta",
  notifications = [],
}: {
  role?: string;
  name?: string;
  notifications?: DbNotification[];
}) {
  const router = useRouter();
  const [panelOpen, setPanelOpen] = React.useState(false);
  const unread = notifications.filter((n) => !n.read).length;

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  const initials = name
    .split(" ")
    .map((n) => n[0])
    .slice(0, 2)
    .join("");

  return (
    <>
      <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b border-border bg-white/90 backdrop-blur px-4 lg:px-6">
        <div className="flex-1 flex items-center max-w-md">
          <div className="relative w-full">
            <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              placeholder="Search substations, job cards, equipment…"
              className="w-full h-10 rounded-[10px] border border-border bg-background-secondary pl-9 pr-14 text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-accent/40 focus:border-accent focus:bg-white transition-colors"
            />
            <kbd className="absolute right-2.5 top-1/2 -translate-y-1/2 hidden sm:inline-flex items-center rounded-md border border-border bg-white px-1.5 py-0.5 text-[10px] font-medium text-slate-400">
              ⌘K
            </kbd>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setPanelOpen(true)}
            className="relative flex h-9 w-9 items-center justify-center rounded-[10px] text-foreground-secondary hover:bg-hover hover:text-foreground transition-colors"
          >
            <Bell className="h-[18px] w-[18px]" />
            {unread > 0 && (
              <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-danger ring-2 ring-white" />
            )}
          </button>

          <div className="h-6 w-px bg-border mx-1" />

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex items-center gap-2.5 rounded-[10px] pl-1.5 pr-2.5 py-1.5 hover:bg-hover transition-colors">
                <Avatar className="h-8 w-8">
                  <AvatarFallback>{initials}</AvatarFallback>
                </Avatar>
                <div className="hidden md:flex flex-col items-start leading-none">
                  <span className="text-sm font-medium text-foreground">{name}</span>
                  <span className="text-[11px] text-foreground-secondary mt-0.5">{role}</span>
                </div>
                <ChevronDown className="hidden md:block h-3.5 w-3.5 text-slate-400" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>My Account</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem>
                <UserCircle /> Profile
              </DropdownMenuItem>
              <DropdownMenuItem>
                <Settings /> Settings
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="text-danger focus:bg-red-50" onClick={handleSignOut}>
                <LogOut /> Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      <NotificationsPanel open={panelOpen} onClose={() => setPanelOpen(false)} notifications={notifications} />
    </>
  );
}
