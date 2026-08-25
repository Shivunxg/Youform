"use client";

import * as React from "react";
import { Search, Bell } from "lucide-react";
import { NotificationsPanel } from "@/components/layout/notifications-panel";
import type { DbNotification } from "@/lib/supabase/types";

export function Header({
  notifications = [],
}: {
  notifications?: DbNotification[];
}) {
  const [panelOpen, setPanelOpen] = React.useState(false);
  const unread = notifications.filter((n) => !(n as any).is_read).length;

  return (
    <>
      <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b border-border bg-white/90 backdrop-blur px-4 lg:px-6">
        <div className="flex-1 flex items-center max-w-lg">
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

        <button
          onClick={() => setPanelOpen(true)}
          className="relative flex h-9 w-9 items-center justify-center rounded-[10px] text-foreground-secondary hover:bg-hover hover:text-foreground transition-colors"
        >
          <Bell className="h-[18px] w-[18px]" />
          {unread > 0 && (
            <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-danger ring-2 ring-white" />
          )}
        </button>
      </header>

      <NotificationsPanel open={panelOpen} onClose={() => setPanelOpen(false)} notifications={notifications} />
    </>
  );
}
