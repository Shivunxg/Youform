"use client";

import * as React from "react";
import { Search, UserCircle2 } from "lucide-react";

function LiveClock() {
  const [now, setNow] = React.useState<Date | null>(null);

  React.useEffect(() => {
    setNow(new Date());
    const id = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(id);
  }, []);

  if (!now) return null;

  const date = now.toLocaleDateString("en-IN", {
    weekday: "short", day: "2-digit", month: "short", year: "numeric",
    timeZone: "Asia/Kolkata",
  });
  const time = now.toLocaleTimeString("en-IN", {
    hour: "2-digit", minute: "2-digit", hour12: true,
    timeZone: "Asia/Kolkata",
  });

  return (
    <div className="hidden sm:flex flex-col items-end leading-none">
      <span className="text-[11px] font-medium text-foreground-secondary">{date}</span>
      <span className="text-sm font-semibold text-foreground mt-0.5">{time} IST</span>
    </div>
  );
}

export function Header({
  profile,
}: {
  profile?: { name: string; email: string; role: string };
}) {
  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b border-border bg-white/95 backdrop-blur px-4 lg:px-6">
      {/* Search */}
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

      {/* Right section */}
      <div className="flex items-center gap-4 ml-auto">
        <LiveClock />

        {profile && (
          <>
            <div className="h-7 w-px bg-border" />
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#0B1A3D] text-white text-xs font-bold shrink-0 select-none">
                {profile.name.trim().charAt(0).toUpperCase()}
              </div>
              <div className="hidden md:flex flex-col leading-none">
                <span className="text-sm font-semibold text-foreground truncate max-w-[140px]">{profile.name}</span>
                <span className="text-[11px] text-foreground-secondary mt-0.5">{profile.role}</span>
              </div>
            </div>
          </>
        )}
      </div>
    </header>
  );
}
