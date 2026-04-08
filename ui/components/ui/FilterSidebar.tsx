"use client";

import { useState, type ReactNode } from "react";
import { motion, AnimatePresence, type PanInfo } from "framer-motion";
import { ChevronDownIcon, XMarkIcon } from "@heroicons/react/24/outline";
import Button from "@/components/ui/Button";

interface FilterSidebarProps {
  title: string;
  desktopOpen: boolean;
  mobileOpen: boolean;
  onMobileClose: () => void;
  mobileMode?: "sheet" | "inlineTop";
  desktopWrapperClassName?: string;
  showMobileActionButton?: boolean;
  mobileActionLabel?: string;
  children: ReactNode;
}

const FilterSidebar = ({
  title,
  desktopOpen,
  mobileOpen,
  onMobileClose,
  mobileMode = "sheet",
  desktopWrapperClassName,
  showMobileActionButton = true,
  mobileActionLabel = "Apply Filters",
  children,
}: FilterSidebarProps) => {
  const MAX_VH = 92;
  const MIN_VH = 42;
  const DEFAULT_VH = 72;
  const SNAP_POINTS = [0, MIN_VH, DEFAULT_VH, MAX_VH] as const;
  const [mobileHeightVh, setMobileHeightVh] = useState(DEFAULT_VH);
  const [mobileInlineOpen, setMobileInlineOpen] = useState(true);

  const clampHeight = (value: number) =>
    Math.max(MIN_VH, Math.min(MAX_VH, value));

  const onHandleDrag = (
    _: MouseEvent | TouchEvent | PointerEvent,
    info: PanInfo
  ) => {
    if (typeof window === "undefined") return;
    const deltaVh = (info.delta.y / window.innerHeight) * 100;
    setMobileHeightVh((prev) => clampHeight(prev - deltaVh));
  };

  const onHandleDragEnd = (
    _: MouseEvent | TouchEvent | PointerEvent,
    info: PanInfo
  ) => {
    if (info.offset.y > 120) {
      onMobileClose();
      return;
    }

    const nearest = SNAP_POINTS.reduce((best, next) => {
      return Math.abs(next - mobileHeightVh) < Math.abs(best - mobileHeightVh)
        ? next
        : best;
    }, SNAP_POINTS[0]);

    if (nearest === 0) {
      onMobileClose();
      return;
    }

    setMobileHeightVh(nearest);
  };

  return (
    <>
      <AnimatePresence initial={false}>
        {desktopOpen && (
          <motion.aside
            key="desktop-sidebar"
            initial={{ opacity: 0, x: -16 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -16 }}
            transition={{ duration: 0.2, ease: "easeInOut" }}
            className={
              desktopWrapperClassName ??
              "hidden rounded-xl border border-slate-200 bg-white p-4 shadow-sm lg:block dark:border-slate-700 dark:bg-slate-900"
            }
          >
            {children}
          </motion.aside>
        )}
      </AnimatePresence>

      {mobileMode === "inlineTop" && (
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm lg:hidden dark:border-slate-700 dark:bg-slate-900">
          <div className="mb-2 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
              {title}
            </h3>
            <button
              type="button"
              aria-label={
                mobileInlineOpen ? "Collapse section" : "Expand section"
              }
              onClick={() => setMobileInlineOpen((prev) => !prev)}
              className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-slate-300 bg-white text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              <ChevronDownIcon
                className={`h-4 w-4 transition-transform duration-200 ${mobileInlineOpen ? "rotate-180" : "rotate-0"}`}
              />
            </button>
          </div>
          {mobileInlineOpen && <div className="pt-1">{children}</div>}
        </div>
      )}

      {mobileMode === "sheet" && mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            aria-label="Close filters"
            className="absolute inset-0 bg-black/40"
            onClick={onMobileClose}
          />
          <motion.div
            className="absolute inset-x-0 top-0 overflow-y-auto rounded-b-2xl bg-white p-4 shadow-xl dark:bg-slate-900"
            style={{ height: `${mobileHeightVh}vh` }}
            initial={{ y: -24, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -24, opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <div className="mb-3 flex justify-center">
              <motion.button
                type="button"
                aria-label="Resize or close filters"
                className="h-1.5 w-12 rounded-full bg-slate-300 dark:bg-slate-600"
                drag="y"
                dragElastic={0.08}
                dragMomentum={false}
                onDrag={onHandleDrag}
                onDragEnd={onHandleDragEnd}
              />
            </div>
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-base font-semibold text-slate-900 dark:text-white">
                {title}
              </h3>
              <button
                type="button"
                aria-label="Close filters"
                className="rounded-md p-1 text-slate-500 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
                onClick={onMobileClose}
              >
                <XMarkIcon className="size-5" />
              </button>
            </div>
            {children}
            {showMobileActionButton && (
              <Button className="mt-6 w-full" onClick={onMobileClose}>
                {mobileActionLabel}
              </Button>
            )}
          </motion.div>
        </div>
      )}
    </>
  );
};

export default FilterSidebar;
