"use client";

import { useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "motion/react";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/shell";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { Schedule } from "@/lib/types";

interface CalendarViewProps {
  items: Schedule[];
  empMap: Map<string, string>;
  shiftMap: Map<string, string>;
  branchId: string;
}

export function CalendarView({ items, empMap, shiftMap, branchId }: CalendarViewProps) {
  const [currentMonth, setCurrentMonth] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth();

  // Build calendar grid
  const firstDay = new Date(year, month, 1).getDay(); // 0=Sun
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const daysInPrevMonth = new Date(year, month, 0).getDate();

  // Map date string to items
  const byDate = new Map<string, Schedule[]>();
  for (const item of items) {
    const list = byDate.get(item.date) ?? [];
    list.push(item);
    byDate.set(item.date, list);
  }

  // Build cells: prev month padding + current month + next month padding
  const cells: { date: string; day: number; isCurrentMonth: boolean }[] = [];

  // Previous month padding
  for (let i = firstDay - 1; i >= 0; i--) {
    const day = daysInPrevMonth - i;
    const prevMonth = month === 0 ? 11 : month - 1;
    const prevYear = month === 0 ? year - 1 : year;
    const dateStr = `${prevYear}-${String(prevMonth + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    cells.push({ date: dateStr, day, isCurrentMonth: false });
  }

  // Current month
  for (let day = 1; day <= daysInMonth; day++) {
    const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    cells.push({ date: dateStr, day, isCurrentMonth: true });
  }

  // Next month padding to fill last row
  const remaining = 42 - cells.length; // 6 rows * 7 days
  for (let day = 1; day <= remaining; day++) {
    const nextMonth = month === 11 ? 0 : month + 1;
    const nextYear = month === 11 ? year + 1 : year;
    const dateStr = `${nextYear}-${String(nextMonth + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    cells.push({ date: dateStr, day, isCurrentMonth: false });
  }

  function prevMonth() {
    setCurrentMonth(new Date(year, month - 1, 1));
  }

  function nextMonth() {
    setCurrentMonth(new Date(year, month + 1, 1));
  }

  const today = new Date();
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;

  const selectedItems = selectedDate ? byDate.get(selectedDate) ?? [] : [];

  return (
    <div className="space-y-4">
      {/* Calendar header */}
      <div className="flex items-center justify-between">
        <h3 className="text-base font-semibold text-foreground">
          {currentMonth.toLocaleDateString("id-ID", { month: "long", year: "numeric" })}
        </h3>
        <div className="flex gap-1">
          <Button variant="outline" size="sm" onClick={prevMonth} className="h-8 w-8 p-0">
            <ChevronLeft size={16} />
          </Button>
          <Button variant="outline" size="sm" onClick={nextMonth} className="h-8 w-8 p-0">
            <ChevronRight size={16} />
          </Button>
        </div>
      </div>

      {/* Day headers */}
      <div className="grid grid-cols-7 gap-1">
        {["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"].map((day) => (
          <div key={day} className="py-1 text-center text-xs font-medium text-muted-foreground">
            {day}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7 gap-1">
        {cells.map((cell) => {
          const dayItems = byDate.get(cell.date) ?? [];
          const hasItems = dayItems.length > 0;
          const isToday = cell.date === todayStr;
          const isSelected = cell.date === selectedDate;

          return (
            <button
              key={cell.date}
              type="button"
              onClick={() => hasItems && setSelectedDate(cell.date)}
              className={`relative flex min-h-[60px] flex-col items-center rounded-md border p-1 text-sm transition-colors ${
                !cell.isCurrentMonth
                  ? "border-transparent text-muted-foreground/40"
                  : isSelected
                    ? "border-primary bg-primary/10"
                    : isToday
                      ? "border-primary/50 bg-primary/5"
                      : "border-border hover:bg-accent"
              } ${hasItems ? "cursor-pointer" : "cursor-default"}`}
            >
              <span className={`text-xs ${isToday ? "font-bold text-primary" : ""}`}>
                {cell.day}
              </span>
              {hasItems && (
                <div className="mt-0.5 flex gap-0.5">
                  {dayItems.slice(0, 3).map((item) => (
                    <span
                      key={item.scheduleId}
                      className={`h-1.5 w-1.5 rounded-full ${
                        item.status === "completed"
                          ? "bg-green-500"
                          : item.status === "started"
                            ? "bg-blue-500"
                            : "bg-amber-500"
                      }`}
                    />
                  ))}
                  {dayItems.length > 3 && (
                    <span className="text-[8px] text-muted-foreground">+{dayItems.length - 3}</span>
                  )}
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 text-xs text-muted-foreground">
        <span className="flex items-center gap-1">
          <span className="h-2 w-2 rounded-full bg-amber-500" /> Scheduled
        </span>
        <span className="flex items-center gap-1">
          <span className="h-2 w-2 rounded-full bg-blue-500" /> Started
        </span>
        <span className="flex items-center gap-1">
          <span className="h-2 w-2 rounded-full bg-green-500" /> Completed
        </span>
      </div>

      {/* Modal detail jadwal */}
      <AnimatePresence>
        {selectedDate && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
            onClick={() => setSelectedDate(null)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-md rounded-lg border border-border bg-card p-4 shadow-xl sm:p-6"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-base font-bold text-foreground">
                  Jadwal {selectedDate}
                </h3>
                <Button variant="ghost" size="sm" onClick={() => setSelectedDate(null)}>
                  Tutup
                </Button>
              </div>

              {selectedItems.length === 0 ? (
                <p className="text-sm text-muted-foreground">Tidak ada jadwal pada tanggal ini.</p>
              ) : (
                <div className="space-y-3">
                  {selectedItems.map((item) => (
                    <div
                      key={item.scheduleId}
                      className="rounded-md border border-border bg-background p-3"
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="text-sm font-semibold text-foreground">
                            {shiftMap.get(item.shiftId) || item.shiftId}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {empMap.get(item.employeeId) || item.employeeId}
                          </p>
                        </div>
                        <StatusBadge status={item.status} />
                      </div>
                      <div className="mt-2">
                        <Button asChild variant="outline" size="sm" className="w-full text-xs">
                          <Link href={`/shift/${item.scheduleId}${item.branchId ? `?branchId=${encodeURIComponent(item.branchId)}` : ""}`}>
                            Detail Shift →
                          </Link>
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
