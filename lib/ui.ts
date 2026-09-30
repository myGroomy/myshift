// Shared Tailwind class maps. Every value traces to a token in DESIGN.md §2–§4.
// New patterns belong here so screens stay token-driven instead of ad-hoc.
export const cardClass =
  "rounded-lg border border-border bg-card p-4 focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-ring";
export const cardConflictClass =
  "rounded-lg border border-destructive-wash bg-destructive-wash p-4 text-destructive-foreground";
export const tableWrapClass = "rounded-lg border border-border bg-card";
export const tableClass = "w-full text-left text-sm";
export const tableHeadClass = "bg-muted text-muted-foreground";
export const thClass = "p-3 text-xs font-semibold uppercase tracking-wide";
export const rowClass = "border-t border-border hover:bg-muted";
export const tdClass = "p-3 align-middle";
export const controlClass =
  "h-11 w-full min-w-0 rounded-md border border-input bg-card px-4 text-sm text-foreground transition-colors placeholder:text-subtle-foreground hover:border-border focus-visible:border-ring focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-ring disabled:cursor-not-allowed disabled:opacity-50";
export const errorClass = "mt-1 text-xs text-destructive-foreground";
export const mutedClass = "text-sm text-muted-foreground";
export const numClass = "tnum text-sm";
export const labelClass = "mb-1 block text-xs font-medium text-muted-foreground";
export const pageTitleClass = "text-xl font-bold tracking-tight text-foreground text-balance sm:text-2xl";
export const pageLeadClass = "mt-1 text-sm text-muted-foreground";
export const formClass = "grid gap-4 sm:grid-cols-2";
export const actionsClass = "flex flex-wrap items-center gap-2";
export const formSectionClass = "mb-6 rounded-lg border border-border bg-card p-4";
export const listStackClass = "grid gap-3";
