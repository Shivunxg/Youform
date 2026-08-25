"use client";

import * as React from "react";
import { X, Bell as BellIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import type { DbNotification } from "@/lib/supabase/types";
import { formatDistanceToNow } from "date-fns";

export function NotificationsPanel({
  open,
  onClose,
  notifications,
}: {
  open: boolean;
  onClose: () => void;
  notifications: DbNotification[];
}) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-slate-900/20 animate-fade-in" onClick={onClose} />
      <div className="relative w-full max-w-sm h-full bg-white shadow-2xl flex flex-col animate-fade-in">
        <div className="flex items-center justify-between h-16 px-5 border-b border-border shrink-0">
          <h2 className="text-sm font-semibold text-foreground">Notifications</h2>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg hover:bg-hover"
          >
            <X className="h-4 w-4 text-foreground-secondary" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto">
          {notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center px-6">
              <BellIcon className="h-8 w-8 text-slate-300 mb-3" />
              <p className="text-sm font-medium text-foreground">No notifications yet</p>
              <p className="text-xs text-foreground-secondary mt-1">
                Job card updates and alerts will show up here.
              </p>
            </div>
          ) : (
            notifications.map((n) => (
              <div
                key={n.id}
                className={cn(
                  "flex gap-3 px-5 py-4 border-b border-border/70 hover:bg-hover/60 transition-colors",
                  !n.read && "bg-blue-50/30"
                )}
              >
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-100 text-foreground-secondary">
                  <BellIcon className="h-4 w-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground">{n.title}</p>
                  {n.body && (
                    <p className="text-xs text-foreground-secondary mt-0.5 leading-relaxed">
                      {n.body}
                    </p>
                  )}
                  <p className="text-[11px] text-slate-400 mt-1.5">
                    {formatDistanceToNow(new Date(n.created_at), { addSuffix: true })}
                  </p>
                </div>
                {!n.read && <span className="h-2 w-2 rounded-full bg-accent shrink-0 mt-1.5" />}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
