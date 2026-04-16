import type { ElementType } from "react";
import { cn } from "@/lib/utils";

type TabItem<T extends string> = {
  id: T;
  label: string;
  note?: string;
  icon: ElementType;
};

type ViewModeTabsProps<T extends string> = {
  tabs: ReadonlyArray<TabItem<T>>;
  activeId: T;
  onChange: (id: T) => void;
  gridClassName?: string;
  buttonClassName?: string;
  noteClassName?: string;
};

export default function ViewModeTabs<T extends string>({
  tabs,
  activeId,
  onChange,
  gridClassName,
  buttonClassName,
  noteClassName,
}: ViewModeTabsProps<T>) {
  return (
    <div
      role="tablist"
      aria-label="View modes"
      className={cn(
        "flex w-full flex-wrap items-end gap-1 border-b border-slate-200 dark:border-slate-700",
        gridClassName
      )}
    >
      {tabs.map((tab, idx) => {
        const isActive = activeId === tab.id;
        const Icon = tab.icon;
        return (
          <div key={tab.id} className="flex items-center">
            <button
              role="tab"
              aria-selected={isActive}
              aria-current={isActive ? "page" : undefined}
              type="button"
              onClick={() => onChange(tab.id)}
              className={cn(
                "relative -mb-px inline-flex cursor-pointer items-center gap-2 border-b-2 border-transparent px-3 py-2.5 text-sm font-semibold whitespace-nowrap transition-colors duration-150",
                "focus-visible:ring-primary-500 focus-visible:ring-2 focus-visible:outline-none",
                isActive
                  ? "border-primary-600 dark:border-primary-400 text-slate-900 dark:text-slate-100"
                  : "text-slate-600 hover:border-slate-300 hover:text-slate-900 dark:text-slate-400 dark:hover:border-slate-600 dark:hover:text-slate-200",
                buttonClassName
              )}
            >
              <Icon
                className={cn(
                  "size-4 shrink-0 transition-colors duration-150",
                  isActive
                    ? "text-primary-600 dark:text-primary-400"
                    : "text-slate-500 dark:text-slate-400"
                )}
              />
              <span>{tab.label}</span>
              {tab.note && (
                <span
                  className={cn(
                    "ml-1 hidden text-[11px] text-slate-500 lg:inline",
                    noteClassName
                  )}
                >
                  {tab.note}
                </span>
              )}
            </button>
            {idx < tabs.length - 1 && (
              <span
                aria-hidden="true"
                className="mx-1 h-4 w-px bg-slate-200 dark:bg-slate-700"
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
