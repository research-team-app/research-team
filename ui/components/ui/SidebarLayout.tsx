"use client";

import { useState, type ReactNode } from "react";
import { motion } from "framer-motion";
import { ChevronLeftIcon, ChevronDownIcon } from "@heroicons/react/24/outline";

interface SidebarLayoutProps {
  /** Content rendered inside the sidebar panel */
  sidebar: ReactNode;
  /** Label shown in the mobile accordion header */
  sidebarTitle?: string;
  /** Main page content */
  children: ReactNode;
  /** Controlled open state */
  open: boolean;
  /** Called when the toggle button is clicked */
  onOpenChange: (open: boolean) => void;
  /** Sidebar width in px on desktop. Default: 280 */
  sidebarWidth?: number;
}

/**
 * Generic responsive sidebar layout.
 *
 * Desktop: animated sliding sidebar with a circular chevron toggle at its edge.
 * Mobile:  collapsible accordion above the main content.
 *
 * Usage:
 *   <SidebarLayout sidebar={<Filters />} sidebarTitle="Filters" open={open} onOpenChange={setOpen}>
 *     <MainContent />
 *   </SidebarLayout>
 */
const SidebarLayout = ({
  sidebar,
  sidebarTitle = "Filters",
  children,
  open,
  onOpenChange,
  sidebarWidth = 280,
}: SidebarLayoutProps) => {
  const [mobileExpanded, setMobileExpanded] = useState(true);

  return (
    <>
      {/* ── Mobile: collapsible accordion (hidden on lg+) ──────────── */}
      <div className="mb-4 lg:hidden">
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-800">
          <div className="mb-2 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
              {sidebarTitle}
            </h3>
            <button
              type="button"
              aria-label={mobileExpanded ? "Collapse" : "Expand"}
              onClick={() => setMobileExpanded((prev) => !prev)}
              className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-slate-300 bg-white text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
            >
              <ChevronDownIcon
                className={`h-4 w-4 transition-transform duration-200 ${
                  mobileExpanded ? "rotate-180" : "rotate-0"
                }`}
              />
            </button>
          </div>
          {mobileExpanded && <div className="pt-1">{sidebar}</div>}
        </div>
      </div>

      {/* ── Desktop: flex layout with animated sidebar ─────────────── */}
      <div className="flex items-start">
        {/* Sidebar panel */}
        <div className="relative hidden shrink-0 lg:block">
          <motion.div
            animate={{ width: open ? sidebarWidth : 0 }}
            transition={{ duration: 0.25, ease: "easeInOut" }}
            className="overflow-hidden"
          >
            <div
              style={{ width: sidebarWidth }}
              className="border-r border-slate-200 pr-5 dark:border-slate-700"
            >
              {sidebar}
            </div>
          </motion.div>

          {/* Circular toggle pinned to the sidebar's right edge */}
          <button
            type="button"
            onClick={() => onOpenChange(!open)}
            aria-label={open ? "Hide sidebar" : "Show sidebar"}
            className="absolute top-1 -right-3.5 z-10 flex h-7 w-7 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 shadow-md transition-colors hover:bg-slate-50 hover:text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400 dark:hover:bg-slate-700 dark:hover:text-slate-200"
          >
            <motion.span
              animate={{ rotate: open ? 0 : 180 }}
              transition={{ duration: 0.25 }}
              className="flex items-center justify-center"
            >
              <ChevronLeftIcon className="size-3.5" />
            </motion.span>
          </button>
        </div>

        {/* Main content */}
        <div className={`min-w-0 flex-1 ${open ? "lg:pl-6" : ""}`}>
          {children}
        </div>
      </div>
    </>
  );
};

export default SidebarLayout;
