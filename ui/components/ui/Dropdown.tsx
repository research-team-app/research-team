"use client";

import { type ReactNode } from "react";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { ChevronDownIcon, CheckIcon } from "@heroicons/react/16/solid";
import clsx from "clsx";

export interface DropdownOption {
  value: string | number;
  label: ReactNode;
  disabled?: boolean;
}

export interface DropdownProps {
  options: DropdownOption[];
  value?: string | number;
  onChange: (value: string | number) => void;
  label: ReactNode;
  className?: string;
  buttonClassName?: string;
  menuClassName?: string;
  optionClassName?: string;
  disabled?: boolean;
  showChevron?: boolean;
  align?: "left" | "right";
}

const Dropdown = ({
  options,
  value,
  onChange,
  label,
  className,
  buttonClassName,
  menuClassName,
  optionClassName,
  disabled = false,
  showChevron = true,
  align = "right",
}: DropdownProps) => {
  return (
    <div className={clsx("relative inline-block text-left", className)}>
      <DropdownMenu.Root>
        <DropdownMenu.Trigger asChild disabled={disabled}>
          <button
            className={clsx(
              // Default styling to match your previous button
              "group inline-flex items-center justify-center gap-x-1.5",
              disabled && "cursor-not-allowed opacity-60",
              buttonClassName
            )}
            // Radix handles aria-expanded and data-state automatically
          >
            {label}
            {showChevron && (
              <ChevronDownIcon
                className={clsx(
                  "h-4 w-4 text-zinc-500 transition-transform duration-200 dark:text-zinc-400",
                  // Radix adds data-state="open" when active
                  "group-data-[state=open]:rotate-180"
                )}
                aria-hidden="true"
              />
            )}
          </button>
        </DropdownMenu.Trigger>

        {/* Portal renders the menu outside the DOM hierarchy to avoid z-index clipping */}
        <DropdownMenu.Portal>
          <DropdownMenu.Content
            align={align === "right" ? "end" : "start"}
            sideOffset={5}
            className={clsx(
              "z-50 min-w-40 rounded-md shadow-lg",
              "bg-white dark:bg-slate-800",
              "border border-zinc-200 dark:border-slate-700",
              "p-1 focus:outline-none",
              // Animation classes
              "data-[state=open]:animate-in data-[state=closed]:animate-out",
              "data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
              "data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95",
              "data-[side=bottom]:slide-in-from-top-2",
              menuClassName
            )}
          >
            {options.map((option) => (
              <DropdownMenu.Item
                key={option.value}
                disabled={option.disabled}
                onSelect={() => onChange(option.value)}
                className={clsx(
                  "relative flex cursor-default items-center justify-between rounded-sm px-4 py-2 text-sm transition-colors outline-none select-none",
                  // Hover/Focus state (Radix uses data-highlighted)
                  "data-highlighted:bg-zinc-100 dark:data-highlighted:bg-slate-700",
                  "data-highlighted:text-zinc-900 dark:data-highlighted:text-zinc-100",
                  "text-zinc-700 dark:text-zinc-300",
                  option.disabled && "pointer-events-none opacity-50",
                  option.value === value && "font-medium",
                  optionClassName
                )}
              >
                <span>{option.label}</span>
                {option.value === value && (
                  <CheckIcon className="h-4 w-4 text-zinc-600 dark:text-zinc-400" />
                )}
              </DropdownMenu.Item>
            ))}
          </DropdownMenu.Content>
        </DropdownMenu.Portal>
      </DropdownMenu.Root>
    </div>
  );
};

export default Dropdown;
