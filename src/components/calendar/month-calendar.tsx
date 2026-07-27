"use client";

import * as React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

export interface CalendarEvent {
  id: string;
  date: string; // YYYY-MM-DD
  label: string;
  variant?: "accent" | "warning" | "danger" | "success";
}

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const dotColor = {
  accent: "bg-accent",
  warning: "bg-warning",
  danger: "bg-danger",
  success: "bg-success",
};

export function MonthCalendar({
  events,
  onEventClick,
}: {
  events: CalendarEvent[];
  onEventClick?: (event: CalendarEvent) => void;
}) {
  const [cursor, setCursor] = React.useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });

  const year = cursor.getFullYear();
  const month = cursor.getMonth();

  const firstDayOfMonth = new Date(year, month, 1);
  const startWeekday = firstDayOfMonth.getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const eventsByDate = React.useMemo(() => {
    const map = new Map<string, CalendarEvent[]>();
    for (const e of events) {
      if (!map.has(e.date)) map.set(e.date, []);
      map.get(e.date)!.push(e);
    }
    return map;
  }, [events]);

  const cells: (number | null)[] = [
    ...Array(startWeekday).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  while (cells.length % 7 !== 0) cells.push(null);

  const todayKey = new Date().toISOString().slice(0, 10);

  function dateKey(day: number) {
    return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm font-semibold text-foreground">
          {MONTHS[month]} {year}
        </p>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setCursor(new Date(year, month - 1, 1))}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-foreground-secondary hover:bg-hover transition-colors"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            onClick={() => setCursor(new Date(year, month + 1, 1))}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-foreground-secondary hover:bg-hover transition-colors"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-1">
        {WEEKDAYS.map((w) => (
          <div key={w} className="text-center text-[11px] font-medium text-foreground-secondary py-1.5">
            {w}
          </div>
        ))}
        {cells.map((day, i) => {
          if (day === null) return <div key={i} className="aspect-square" />;
          const key = dateKey(day);
          const dayEvents = eventsByDate.get(key) ?? [];
          const isToday = key === todayKey;
          return (
            <div
              key={i}
              className={cn(
                "aspect-square rounded-lg border p-1.5 flex flex-col gap-1 overflow-hidden",
                isToday ? "border-accent bg-blue-50/40" : "border-border bg-white"
              )}
            >
              <span className={cn("text-[11px] font-medium", isToday ? "text-accent" : "text-foreground-secondary")}>
                {day}
              </span>
              <div className="flex-1 space-y-0.5 overflow-hidden">
                {dayEvents.slice(0, 2).map((e) => (
                  <button
                    key={e.id}
                    onClick={() => onEventClick?.(e)}
                    className="flex w-full items-center gap-1 rounded px-1 py-0.5 text-left hover:bg-hover transition-colors"
                    title={e.label}
                  >
                    <span className={cn("h-1.5 w-1.5 rounded-full shrink-0", dotColor[e.variant ?? "accent"])} />
                    <span className="text-[10px] text-foreground truncate">{e.label}</span>
                  </button>
                ))}
                {dayEvents.length > 2 && (
                  <p className="text-[10px] text-foreground-secondary px-1">+{dayEvents.length - 2} more</p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
