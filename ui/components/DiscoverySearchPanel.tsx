"use client";

import type { ElementType, ReactNode } from "react";
import ViewModeTabs from "@/components/ViewModeTabs";
import { cn } from "@/lib/utils";

export type DiscoveryTab<T extends string> = {
  id: T;
  label: string;
  icon: ElementType;
  note?: string;
};

type DiscoverySearchPanelProps<T extends string> = {
  panelTitle: string;
  tabs: ReadonlyArray<DiscoveryTab<T>>;
  activeId: T;
  onTabChange: (id: T) => void;
  children: ReactNode;
  hint?: ReactNode;
  limitControl?: ReactNode;
  className?: string;
};

export default function DiscoverySearchPanel<T extends string>({
  panelTitle,
  tabs,
  activeId,
  onTabChange,
  children,
  hint,
  limitControl,
  className,
}: DiscoverySearchPanelProps<T>) {
  const showFooter = Boolean(hint || limitControl);

  return (
    <div
      className={cn(
        "mb-5 overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-[0_2px_12px_rgba(15,23,42,0.05),0_1px_2px_rgba(15,23,42,0.03)] sm:mb-6",
        "dark:border-slate-700/70 dark:bg-slate-800/70 dark:shadow-[0_2px_14px_rgba(0,0,0,0.25)]",
        className,
      )}
    >
      <div className="h-0.5 bg-linear-to-r from-slate-400/50 via-slate-200/80 to-transparent dark:from-slate-500/70 dark:via-slate-600/80 dark:to-transparent" />

      <div className="border-b border-slate-100 px-5 py-4 sm:px-6 dark:border-slate-700/80">
        <h2 className="text-slate-500 dark:text-slate-400 mb-3 text-[11px] font-semibold tracking-[0.14em] uppercase">
          {panelTitle}
        </h2>
        <ViewModeTabs
          tabs={tabs}
          activeId={activeId}
          onChange={onTabChange}
          gridClassName="border-b-0"
          buttonClassName="sm:px-4"
        />
      </div>

      <div className="px-5 py-5 sm:px-6">
        {children}

        {showFooter && (
          <div className="border-slate-100 dark:border-slate-700/80 mt-5 space-y-4 border-t pt-5">
            {hint && (
              <div className="text-slate-600 dark:text-slate-400 text-sm leading-relaxed">
                {hint}
              </div>
            )}
            {limitControl}
          </div>
        )}
      </div>
    </div>
  );
}

export function ResultLimitRow({
  children,
  label = "Result limit",
}: {
  children: ReactNode;
  label?: string;
}) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-6">
      <span className="text-slate-500 dark:text-slate-400 w-28 shrink-0 text-xs font-semibold tracking-wide uppercase">
        {label}
      </span>
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}
