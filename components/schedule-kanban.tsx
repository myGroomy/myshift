"use client";

import { useState } from "react";
import Link from "next/link";
import { motion } from "motion/react";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/shell";
import type { Schedule, Shift } from "@/lib/types";

interface KanbanBoardProps {
  items: Schedule[];
  empMap: Map<string, string>;
  shiftMap: Map<string, string>;
  branchId: string;
  shifts: Shift[];
  onMove: (scheduleId: string, newDate: string) => Promise<void>;
  onShiftChange: (scheduleId: string, newShiftId: string) => Promise<void>;
}

interface DragState {
  scheduleId: string;
  sourceDate: string;
  sourceShiftId: string;
}

export function KanbanBoard({ items, empMap, shiftMap, branchId, shifts, onMove, onShiftChange }: KanbanBoardProps) {
  const [dragState, setDragState] = useState<DragState | null>(null);
  const [dragOverTarget, setDragOverTarget] = useState<{ date: string; shiftId: string } | null>(null);
  const [movingId, setMovingId] = useState<string | null>(null);

  // Group items by date
  const byDate = new Map<string, Schedule[]>();
  for (const item of items) {
    const list = byDate.get(item.date) ?? [];
    list.push(item);
    byDate.set(item.date, list);
  }

  // Sort dates and build columns (only dates that have items, sorted)
  const dates = [...byDate.keys()].sort();

  // Build shift list: use provided shifts, fallback to shifts from items
  const shiftList = shifts.length > 0 ? shifts : [...new Set(items.map((i) => i.shiftId))].map((id) => ({
    shiftId: id,
    branchId: "",
    name: shiftMap.get(id) || id,
    startTime: "",
    endTime: "",
  }));

  function handleDragStart(scheduleId: string, date: string, shiftId: string) {
    setDragState({ scheduleId, sourceDate: date, sourceShiftId: shiftId });
  }

  function handleDragOver(e: React.DragEvent, date: string, shiftId: string) {
    e.preventDefault();
    setDragOverTarget({ date, shiftId });
  }

  function handleDragLeave() {
    setDragOverTarget(null);
  }

  async function handleDrop(e: React.DragEvent, targetDate: string, targetShiftId: string) {
    e.preventDefault();
    if (!dragState) {
      setDragOverTarget(null);
      return;
    }

    const { scheduleId, sourceDate, sourceShiftId } = dragState;
    const sameDate = sourceDate === targetDate;
    const sameShift = sourceShiftId === targetShiftId;

    if (sameDate && sameShift) {
      setDragState(null);
      setDragOverTarget(null);
      return;
    }

    setMovingId(scheduleId);
    try {
      if (!sameDate) {
        await onMove(scheduleId, targetDate);
      } else if (!sameShift) {
        await onShiftChange(scheduleId, targetShiftId);
      }
    } finally {
      setMovingId(null);
      setDragState(null);
      setDragOverTarget(null);
    }
  }

  if (dates.length === 0) {
    return (
      <div className="rounded-lg border border-border bg-card p-8 text-center text-sm text-muted-foreground">
        Belum ada jadwal untuk ditampilkan
      </div>
    );
  }

  return (
    <div className="overflow-x-auto pb-4">
      <div className="flex gap-4" style={{ minWidth: `${dates.length * 320}px` }}>
        {dates.map((date) => {
          const dayItems = byDate.get(date) ?? [];
          const isDateOver = dragOverTarget?.date === date && dragState !== null;

          return (
            <div
              key={date}
              className={`flex w-72 shrink-0 flex-col rounded-lg border transition-colors ${
                isDateOver ? "border-primary bg-primary/5" : "border-border bg-card"
              }`}
              onDragOver={(e) => {
                // Allow drop on the date column itself (for date-only moves)
                e.preventDefault();
              }}
            >
              {/* Column header */}
              <div className="border-b border-border px-3 py-2">
                <p className="text-xs font-medium text-muted-foreground">
                  {formatDateLabel(date)}
                </p>
                <p className="text-sm font-semibold text-foreground">{date}</p>
              </div>

              {/* Shift sub-columns */}
              <div className="flex flex-col gap-2 p-2">
                {shiftList.map((shift) => {
                  const shiftItems = dayItems.filter((i) => i.shiftId === shift.shiftId);
                  const isOver = dragOverTarget?.date === date && dragOverTarget?.shiftId === shift.shiftId && dragState !== null;

                  return (
                    <div
                      key={shift.shiftId}
                      className={`flex flex-col gap-2 rounded-md border p-2 transition-colors ${
                        isOver ? "border-primary bg-primary/10" : "border-border/50 bg-background/50"
                      }`}
                      onDragOver={(e) => handleDragOver(e, date, shift.shiftId)}
                      onDragLeave={handleDragLeave}
                      onDrop={(e) => handleDrop(e, date, shift.shiftId)}
                    >
                      {/* Shift header */}
                      <div className="flex items-center justify-between px-1">
                        <p className="text-xs font-semibold text-foreground">{shift.name}</p>
                        <p className="text-[10px] text-muted-foreground">
                          {shift.startTime}–{shift.endTime}
                        </p>
                      </div>

                      {/* Cards */}
                      {shiftItems.map((item) => {
                        const scheduleKey = `${item.branchId ?? branchId}:${item.scheduleId}`;
                        const isDragging = dragState?.scheduleId === item.scheduleId;
                        const isMoving = movingId === item.scheduleId;

                        return (
                          <motion.div
                            key={scheduleKey}
                            layout
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.2 }}
                            draggable
                            onDragStart={() => handleDragStart(item.scheduleId, item.date, item.shiftId)}
                            onDragEnd={() => {
                              setDragState(null);
                              setDragOverTarget(null);
                            }}
                            className={`cursor-grab rounded-md border border-border bg-background p-3 shadow-xs transition-shadow hover:shadow-sm active:cursor-grabbing ${
                              isDragging ? "opacity-40" : ""
                            } ${isMoving ? "opacity-60" : ""} ${
                              item.conflictWarning ? "border-destructive-wash bg-destructive-wash/20" : ""
                            }`}
                          >
                            <div className="flex items-start justify-between gap-2">
                              <p className="text-sm font-semibold text-foreground">
                                {empMap.get(item.employeeId) || item.employeeId}
                              </p>
                              <StatusBadge status={item.status} />
                            </div>
                            <p className="mt-1 text-xs text-muted-foreground">
                              {item.shiftName || ""}
                            </p>
                            <div className="mt-2">
                              <Button asChild variant="ghost" size="sm" className="h-7 w-full text-xs">
                                <Link href={`/shift/${item.scheduleId}${item.branchId ? `?branchId=${encodeURIComponent(item.branchId)}` : ""}`}>
                                  Detail →
                                </Link>
                              </Button>
                            </div>
                          </motion.div>
                        );
                      })}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function formatDateLabel(dateStr: string): string {
  const date = new Date(dateStr + "T00:00:00");
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  if (date.getTime() === today.getTime()) return "Hari ini";
  if (date.getTime() === tomorrow.getTime()) return "Besok";
  if (date.getTime() === yesterday.getTime()) return "Kemarin";

  return date.toLocaleDateString("id-ID", { weekday: "short", day: "numeric", month: "short" });
}
