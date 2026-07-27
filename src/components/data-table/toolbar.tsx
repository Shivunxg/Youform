"use client";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export function PageToolbar({
  search,
  onSearchChange,
  placeholder = "Search…",
  right,
}: {
  search: string;
  onSearchChange: (v: string) => void;
  placeholder?: string;
  right?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
      <div className="relative w-full sm:max-w-xs">
        <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
        <Input
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder={placeholder}
          className="pl-9"
        />
      </div>
      {right && <div className="flex items-center gap-2">{right}</div>}
    </div>
  );
}

export function EmptyState({ title, description }: { title: string; description: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <p className="text-sm font-medium text-foreground">{title}</p>
      <p className="text-sm text-foreground-secondary mt-1 max-w-sm">{description}</p>
    </div>
  );
}
