"use client";

import type { ElementType } from "react";
import { HiCheck } from "react-icons/hi";
import { cn } from "@/lib/utils";
import { AcademicStatusKey } from "@/store/useProfileStore";

export type AcademicStatusOption = {
  key: string;
  label: string;
  icon: ElementType;
};

type Props = {
  options: readonly AcademicStatusOption[];
  isChecked: (key: AcademicStatusKey) => boolean;
  onToggle: (key: AcademicStatusKey, checked: boolean) => void;
  /** Number of columns. Default 2. */
  columns?: 1 | 2 | 3;
};

/**
 * Reusable toggle-button grid for academic status options.
 * Used in both the Collaborators filter panel and the Profile edit form.
 */
export function AcademicStatusPicker({
  options,
  isChecked,
  onToggle,
  columns = 2,
}: Props) {
  return (
    <div
      className={cn(
        "grid grid-cols-1 gap-1.5",
        columns >= 2 && "sm:grid-cols-2",
        columns === 3 && "lg:grid-cols-3"
      )}
    >
      {options.map((option) => {
        const key = option.key as AcademicStatusKey;
        const isOn = isChecked(key);
        const Icon = option.icon;
        return (
          <button
            key={key}
            type="button"
            onClick={() => onToggle(key, !isOn)}
            className={cn(
              "inline-flex w-full min-w-0 items-center gap-2.5 rounded-lg border px-3 py-2 text-sm font-medium transition-all duration-150",
              isOn
                ? "text-primary-800 dark:text-primary-300 border-gray-300 bg-slate-100 dark:border-gray-700/60 dark:bg-gray-900/20"
                : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800/50 dark:text-slate-300 dark:hover:border-slate-600 dark:hover:bg-slate-700/50"
            )}
          >
            {/* Custom checkbox indicator */}
            <span
              className={cn(
                "flex size-4 shrink-0 items-center justify-center rounded border transition-colors",
                isOn
                  ? "border-primary-600 bg-primary-600 dark:border-primary-500 dark:bg-primary-500 text-white"
                  : "border-slate-300 bg-white dark:border-slate-600 dark:bg-slate-800"
              )}
            >
              {isOn && <HiCheck className="size-2.5 stroke-[3px]" />}
            </span>
            <Icon
              className={cn(
                "size-3.5 shrink-0 transition-colors",
                isOn
                  ? "text-primary-600 dark:text-primary-400"
                  : "text-slate-400 dark:text-slate-500"
              )}
            />
            <span className="truncate">{option.label}</span>
          </button>
        );
      })}
    </div>
  );
}
