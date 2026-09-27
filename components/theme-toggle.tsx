"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";

const STORAGE_KEY = "myshift-theme";

export function ThemeToggle() {
  const [dark, setDark] = useState(false);

  // app/layout.tsx applies the class before paint; this just syncs the icon.
  useEffect(() => {
    setDark(document.documentElement.classList.contains("dark"));
  }, []);

  function toggle() {
    const next = !dark;
    setDark(next);
    document.documentElement.classList.toggle("dark", next);
    localStorage.setItem(STORAGE_KEY, next ? "dark" : "light");
  }

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={toggle}
      aria-label={dark ? "Ganti ke mode terang" : "Ganti ke mode gelap"}
      className="h-9 w-9 rounded-lg"
    >
      <span className="material-symbols-outlined text-lg">{dark ? "light_mode" : "dark_mode"}</span>
    </Button>
  );
}
