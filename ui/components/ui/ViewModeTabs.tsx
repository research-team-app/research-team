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
  buttonClassName,
}: ViewModeTabsProps<T>) {
  return (
    <div
      role="tablist"
      aria-label="View modes"
      className="flex border-b border-slate-200 dark:border-slate-700"
    >
      {tabs.map((tab) => {
        const isActive = activeId === tab.id;
        const Icon = tab.icon;
        return (
          <button
            key={tab.id}
            role="tab"
            aria-selected={isActive}
            type="button"
            onClick={() => onChange(tab.id)}
            className={cn(
              "relative flex cursor-pointer items-center gap-2 px-4 py-2.5 text-sm font-medium transition-colors duration-150",
              "focus-visible:ring-primary-500 focus-visible:ring-2 focus-visible:outline-none focus-visible:ring-inset",
              "after:absolute after:right-0 after:-bottom-px after:left-0 after:h-0.5 after:rounded-t after:transition-all after:duration-150",
              isActive
                ? "text-primary-600 after:bg-primary-600 dark:text-primary-400 dark:after:bg-primary-400"
                : "text-slate-500 after:bg-transparent hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200",
              buttonClassName
            )}
          >
            <Icon
              className={cn(
                "size-4 shrink-0 transition-colors duration-150",
                isActive
                  ? "text-primary-600 dark:text-primary-400"
                  : "text-slate-400 dark:text-slate-500"
              )}
            />
            <span>{tab.label}</span>
          </button>
        );
      })}
    </div>
  );
}
