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
    }, 3000);
  }, []);

  const icons: Record<ToastType, string> = {
    success: "check_circle",
    error: "error",
    info: "info",
  };

  const colors: Record<ToastType, string> = {
    success: "border-green-500 bg-green-50 text-green-800 dark:bg-green-900/20 dark:text-green-300",
    error: "border-red-500 bg-red-50 text-red-800 dark:bg-red-900/20 dark:text-red-300",
    info: "border-[#0075de] bg-blue-50 text-blue-800 dark:bg-blue-900/20 dark:text-blue-300",
  };

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      {mounted &&
        createPortal(
          <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2">
            <AnimatePresence>
              {toasts.map((t) => (
                <motion.div
                  key={t.id}
                  initial={{ opacity: 0, y: 20, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 10, scale: 0.95 }}
                  transition={{ duration: 0.2 }}
                  className={cn(
                    "flex items-center gap-2 rounded-lg border px-4 py-3 text-sm font-medium shadow-lg",
                    colors[t.type]
                  )}
                >
                  <span className="material-symbols-outlined text-lg">{icons[t.type]}</span>
                  {t.message}
                </motion.div>
              ))}
            </AnimatePresence>
          </div>,
          document.body
        )}
    </ToastContext.Provider>
  );
}
