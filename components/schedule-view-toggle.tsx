"use client";

import { Button } from "@/components/ui/button";
import { Calendar, KanbanSquare } from "lucide-react";

export type ScheduleViewMode = "kanban" | "calendar";

interface ScheduleViewToggleProps {
  mode: ScheduleViewMode;
  onChange: (mode: ScheduleViewMode) => void;
}

export function ScheduleViewToggle({ mode, onChange }: ScheduleViewToggleProps) {
  return (
    <div className="inline-flex rounded-md border border-border bg-card p-0.5">
      <Button
        type="button"
        variant={mode === "kanban" ? "default" : "ghost"}
        size="sm"
        onClick={() => onChange("kanban")}
        className="h-8 gap-1.5 text-xs"
      >
        <KanbanSquare size={14} />
        Kanban
      </Button>
      <Button
        type="button"
        variant={mode === "calendar" ? "default" : "ghost"}
        size="sm"
        onClick={() => onChange("calendar")}
        className="h-8 gap-1.5 text-xs"
      >
        <Calendar size={14} />
        Calendar
      </Button>
    </div>
  );
}
