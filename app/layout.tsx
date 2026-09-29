import type { Metadata } from "next";
import type { ReactNode } from "react";
import { ThemeScript } from "@/components/theme-script";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "MYSHIFT",
    template: "%s · MYSHIFT",
  },
  description: "Manajemen shift dan operasional harian F&B UMKM multi-cabang.",
  applicationName: "MYSHIFT",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="id" suppressHydrationWarning>
      <head>
        <ThemeScript />
      </head>
      <body className="font-sans">
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-100 focus:rounded-md focus:bg-card focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:shadow-lg"
        >
          Lewati ke konten utama
        </a>
        {children}
      </body>
    </html>
  );
}
