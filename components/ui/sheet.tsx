"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "motion/react";
import { cn } from "@/lib/utils";

interface SheetProps {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
  side?: "left" | "right" | "bottom";
}

export function Sheet({ open, onClose, children, side = "right" }: SheetProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    if (open) window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [open, onClose]);

  if (!mounted) return null;

  const slideClass = {
    left: "inset-y-0 left-0 h-full w-72",
    right: "inset-y-0 right-0 h-full w-72",
    bottom: "inset-x-0 bottom-0 w-full rounded-t-2xl",
  }[side];

  return createPortal(
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-50 bg-black/40"
            onClick={onClose}
          />
          <motion.div
            initial={{ x: side === "left" ? "-100%" : side === "right" ? "100%" : 0, y: side === "bottom" ? "100%" : 0 }}
            animate={{ x: 0, y: 0 }}
            exit={{ x: side === "left" ? "-100%" : side === "right" ? "100%" : 0, y: side === "bottom" ? "100%" : 0 }}
            transition={{ type: "spring", damping: 30, stiffness: 300 }}
            className={cn("fixed z-50 bg-card text-card-foreground shadow-xl", slideClass)}
          >
            {children}
          </motion.div>
        </>
      )}
    </AnimatePresence>,
    document.body
  );
}
