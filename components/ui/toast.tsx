"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "motion/react";
import { cn } from "@/lib/utils";

type ToastType = "success" | "error" | "info";

interface ToastItem {
  id: number;
  message: string;
  type: ToastType;
}

interface ToastContextValue {
  toast: (message: string, type?: ToastType) => void;
}

const ToastContext = createContext<ToastContextValue>({ toast: () => {} });

export function useToast() {
  return useContext(ToastContext);
}

let toastId = 0;

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const toast = useCallback((message: string, type: ToastType = "info") => {
    const id = ++toastId;
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3500);
  }, []);

  const icons: Record<ToastType, string> = {
    success: "check_circle",
    error: "error",
    info: "info",
  };

  const colors: Record<ToastType, string> = {
    success: "border-success-wash bg-success-wash text-success",
    error: "border-destructive-wash bg-destructive-wash text-destructive-foreground",
    info: "border-border bg-accent text-accent-foreground",
  };

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      {mounted &&
        createPortal(
          <div
            role="status"
            aria-live="polite"
            aria-atomic="true"
            className="pointer-events-none fixed bottom-20 right-4 z-[100] flex flex-col gap-2 sm:bottom-4"
          >
            <AnimatePresence>
              {toasts.map((t) => (
                <motion.div
                  key={t.id}
                  initial={{ opacity: 0, y: 20, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 10, scale: 0.95 }}
                  transition={{ duration: 0.2 }}
                  className={cn(
                    "pointer-events-auto flex items-center gap-2 rounded-lg border px-4 py-3 text-sm font-medium shadow-lg backdrop-blur-sm",
                    colors[t.type]
                  )}
                >
                  <span className="material-symbols-outlined text-lg">{icons[t.type]}</span>
                  <span>{t.message}</span>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>,
          document.body
        )}
    </ToastContext.Provider>
  );
}
