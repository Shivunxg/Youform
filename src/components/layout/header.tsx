// @ts-nocheck
"use client";

import * as React from "react";
import { Search, X, ClipboardList, FileText, MapPin, Wrench } from "lucide-react";
import { useRouter, usePathname } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

// ── Live IST clock ─────────────────────────────────────────────────────────────
function LiveClock() {
  const [now, setNow] = React.useState<Date | null>(null);
  React.useEffect(() => {
    setNow(new Date());
    const id = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(id);
  }, []);
  if (!now) return null;
  const date = now.toLocaleDateString("en-IN", { weekday: "short", day: "2-digit", month: "short", year: "numeric", timeZone: "Asia/Kolkata" });
  const time = now.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true, timeZone: "Asia/Kolkata" });
  return (
    <div className="hidden sm:flex flex-col items-end leading-none">
      <span className="text-[11px] font-medium text-foreground-secondary">{date}</span>
      <span className="text-sm font-semibold text-foreground mt-0.5">{time} IST</span>
    </div>
  );
}

// ── Search ─────────────────────────────────────────────────────────────────────
interface SearchResult { type: "job_card" | "station" | "proposal" | "equipment"; id: string; title: string; subtitle: string; href: string }

const TYPE_CONFIG = {
  job_card:  { label: "Job Cards",  Icon: ClipboardList, color: "text-blue-500"   },
  station:   { label: "Stations",   Icon: MapPin,        color: "text-green-500"  },
  proposal:  { label: "Proposals",  Icon: FileText,      color: "text-purple-500" },
  equipment: { label: "Equipment",  Icon: Wrench,        color: "text-amber-500"  },
};
const TYPE_ORDER: SearchResult["type"][] = ["job_card", "station", "proposal", "equipment"];

function GlobalSearch({ prefix }: { prefix: string }) {
  const supabase = React.useMemo(() => createClient(), []);
  const router   = useRouter();
  const [query, setQuery]       = React.useState("");
  const [results, setResults]   = React.useState<SearchResult[]>([]);
  const [loading, setLoading]   = React.useState(false);
  const [open, setOpen]         = React.useState(false);
  const [activeIdx, setActiveIdx] = React.useState(-1);
  const inputRef = React.useRef<HTMLInputElement>(null);
  const dropRef  = React.useRef<HTMLDivElement>(null);
  const timerRef = React.useRef<ReturnType<typeof setTimeout>>();

  // Debounce
  React.useEffect(() => {
    if (query.length < 2) { setResults([]); setOpen(false); setLoading(false); return; }
    setLoading(true); setOpen(true);
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => runSearch(query), 300);
    return () => clearTimeout(timerRef.current);
  }, [query]);

  async function runSearch(q: string) {
    const like     = `%${q}%`;
    const isAdmin  = prefix === "/admin";
    const promises: Promise<SearchResult[]>[] = [];

    // Job cards (all roles)
    promises.push(
      supabase.from("job_cards")
        .select("id, job_card_number, description, current_status")
        .or(`job_card_number.ilike.${like},description.ilike.${like}`)
        .limit(5)
        .then(({ data }) => (data ?? []).map((d) => ({
          type: "job_card" as const, id: d.id,
          title: d.job_card_number,
          subtitle: (d.description ?? d.current_status ?? "").replace(/_/g, " "),
          href: `${prefix}/job-cards`,
        })))
    );

    if (isAdmin) {
      // Stations
      promises.push(
        supabase.from("hierarchy_nodes")
          .select("id, name, code")
          .eq("level", 4)
          .or(`name.ilike.${like},code.ilike.${like}`)
          .limit(4)
          .then(({ data }) => (data ?? []).map((d) => ({
            type: "station" as const, id: d.id,
            title: d.name,
            subtitle: d.code ? `Code: ${d.code}` : "Substation",
            href: `/admin/equipment?station=${d.id}`,
          })))
      );

      // Proposals
      promises.push(
        supabase.from("proposals")
          .select("id, title, status")
          .ilike("title", like)
          .limit(4)
          .then(({ data }) => (data ?? []).map((d) => ({
            type: "proposal" as const, id: d.id,
            title: d.title,
            subtitle: (d.status ?? "").replace(/_/g, " "),
            href: `/admin/proposals/${d.id}`,
          })))
      );

      // Equipment instances
      promises.push(
        supabase.from("equipment_instances")
          .select("id, name, serial_number, station_id")
          .or(`name.ilike.${like},serial_number.ilike.${like}`)
          .limit(4)
          .then(({ data }) => (data ?? []).map((d) => ({
            type: "equipment" as const, id: d.id,
            title: d.name,
            subtitle: d.serial_number ? `S/N: ${d.serial_number}` : "Equipment asset",
            href: `/admin/equipment?station=${d.station_id}`,
          })))
      );
    }

    const all = (await Promise.all(promises)).flat();
    // Sort by type order
    all.sort((a, b) => TYPE_ORDER.indexOf(a.type) - TYPE_ORDER.indexOf(b.type));
    setResults(all);
    setLoading(false);
    setActiveIdx(-1);
  }

  function navigate(href: string) {
    router.push(href);
    setQuery(""); setOpen(false); setResults([]);
    inputRef.current?.blur();
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (!open) return;
    if (e.key === "Escape")    { setOpen(false); inputRef.current?.blur(); return; }
    if (e.key === "ArrowDown") { e.preventDefault(); setActiveIdx((i) => Math.min(i + 1, results.length - 1)); }
    if (e.key === "ArrowUp")   { e.preventDefault(); setActiveIdx((i) => Math.max(i - 1, -1)); }
    if (e.key === "Enter" && activeIdx >= 0 && results[activeIdx]) { navigate(results[activeIdx].href); }
  }

  // Close on outside click
  React.useEffect(() => {
    function handler(e: MouseEvent) {
      if (!dropRef.current?.contains(e.target as Node) && !inputRef.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // ⌘K / Ctrl+K shortcut
  React.useEffect(() => {
    function handler(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") { e.preventDefault(); inputRef.current?.focus(); setOpen(query.length >= 2); }
    }
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [query]);

  // Group results by type, preserving TYPE_ORDER
  const grouped = TYPE_ORDER.reduce<Record<string, SearchResult[]>>((acc, t) => {
    const items = results.filter((r) => r.type === t);
    if (items.length) acc[t] = items;
    return acc;
  }, {});
  const showDropdown = open && query.length >= 2;

  return (
    <div className="relative flex-1 max-w-lg">
      <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 z-10" />
      <input
        ref={inputRef}
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onKeyDown={handleKeyDown}
        onFocus={() => { if (results.length > 0) setOpen(true); }}
        placeholder="Search substations, job cards, equipment…"
        className="w-full h-10 rounded-[10px] border border-border bg-background-secondary pl-9 pr-14 text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-accent/40 focus:border-accent focus:bg-white transition-colors"
      />
      {query && (
        <button
          onClick={() => { setQuery(""); setOpen(false); setResults([]); inputRef.current?.focus(); }}
          className="absolute right-8 top-1/2 -translate-y-1/2 text-slate-400 hover:text-foreground transition-colors"
          aria-label="Clear search"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      )}
      <kbd className="absolute right-2.5 top-1/2 -translate-y-1/2 hidden sm:inline-flex items-center rounded-md border border-border bg-white px-1.5 py-0.5 text-[10px] font-medium text-slate-400">
        ⌘K
      </kbd>

      {showDropdown && (
        <div
          ref={dropRef}
          className="absolute left-0 right-0 top-[calc(100%+6px)] z-50 rounded-xl border border-border bg-white shadow-xl overflow-hidden max-h-[420px] overflow-y-auto"
        >
          {loading && results.length === 0 && (
            <p className="text-xs text-foreground-secondary px-4 py-4 animate-pulse">Searching…</p>
          )}
          {!loading && results.length === 0 && (
            <p className="text-xs text-foreground-secondary px-4 py-4">No results for &ldquo;{query}&rdquo;</p>
          )}

          {Object.entries(grouped).map(([type, items]) => {
            const cfg = TYPE_CONFIG[type as keyof typeof TYPE_CONFIG];
            if (!cfg) return null;
            const { Icon } = cfg;
            return (
              <div key={type}>
                <p className="px-4 pt-3 pb-1 text-[10px] font-semibold uppercase tracking-wide text-foreground-secondary border-t border-border first:border-t-0">
                  {cfg.label}
                </p>
                {items.map((r) => {
                  const idx = results.indexOf(r);
                  return (
                    <button
                      key={r.id}
                      onClick={() => navigate(r.href)}
                      className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors ${activeIdx === idx ? "bg-blue-50" : "hover:bg-hover"}`}
                    >
                      <Icon className={`h-4 w-4 shrink-0 ${cfg.color}`} />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-foreground truncate">{r.title}</p>
                        {r.subtitle && <p className="text-[11px] text-foreground-secondary truncate capitalize">{r.subtitle}</p>}
                      </div>
                    </button>
                  );
                })}
              </div>
            );
          })}

          {results.length > 0 && (
            <p className="px-4 py-2 text-[10px] text-foreground-secondary border-t border-border bg-background-secondary">
              ↑↓ navigate · Enter to open · Esc to close
            </p>
          )}
        </div>
      )}
    </div>
  );
}

// ── Header ─────────────────────────────────────────────────────────────────────
export function Header({ profile }: { profile?: { name: string; email: string; role: string } }) {
  const pathname = usePathname();
  const prefix   = pathname?.startsWith("/ae") ? "/ae" : pathname?.startsWith("/se") ? "/se" : pathname?.startsWith("/kptcl") ? "/kptcl" : "/admin";

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b border-border bg-white/95 backdrop-blur px-4 lg:px-6">
      <GlobalSearch prefix={prefix} />

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
