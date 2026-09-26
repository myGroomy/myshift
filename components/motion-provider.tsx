"use client";

import { MotionConfig } from "motion/react";
import { ReactNode } from "react";

export function MotionProvider({ children }: { children: ReactNode }) {
  return (
    <MotionConfig transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}>
      {children}
    </MotionConfig>
  );
}
