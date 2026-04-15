"use client";

import * as React from "react";
import { Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import Button, {
  type Intent,
  type Size,
  type Variant,
} from "@/components/ui/Button";

import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

export type ComboboxOption = {
  value: string;
  label: string;
};

interface ComboboxFilterProps {
  label?: string;
  icon?: React.ElementType;
  options: ComboboxOption[];
  value?: string;
  onChange: (value: string) => void;
  placeholder?: string;
  emptyText?: string;
  containerClassName?: string;
  intent?: Intent;
  variant?: Variant;
  size?: Size;
  className?: string;
}

export function ComboboxFilter({
  label,
  icon: Icon,
  options,
  value,
  onChange,
  placeholder = "Select...",
  emptyText = "No results found.",
  intent = "default",
  variant = "outline",
  size = "md",
  className,
  containerClassName,
}: ComboboxFilterProps) {
  const [open, setOpen] = React.useState(false);

  const selectedLabel = options.find((option) => option.value === value)?.label;

  const activeColor = React.useMemo(() => {
    switch (intent) {
      case "primary":
        return "text-primary-600 dark:text-primary-400";
      case "secondary":
        return "text-secondary-600 dark:text-secondary-400";
      default:
        return "text-slate-900 dark:text-slate-100";
    }
  }, [intent]);

  const focusRingClass = React.useMemo(() => {
    switch (intent) {
      case "secondary":
        return "focus-visible:ring-secondary-500";
      case "danger":
        return "focus-visible:ring-danger-500";
      default:
        return "focus-visible:ring-primary-500";
    }
  }, [intent]);

  return (
    <div className={cn("space-y-2", containerClassName)}>
      {label && (
        <label className="flex items-center text-sm font-medium text-slate-700 dark:text-slate-300">
          {Icon && (
            <Icon className="mr-2 size-4 text-slate-500 dark:text-slate-400" />
          )}
          {label}
        </label>
      )}

      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            intent={intent}
            variant="solid"
            size={size}
            role="combobox"
            aria-expanded={open}
            fullWidth
            endIcon={<ChevronsUpDown className="size-4 shrink-0 opacity-50" />}
            className={cn(
              "font-normal",
              "focus-visible:ring-2 focus-visible:ring-offset-2 dark:ring-offset-slate-950",
              focusRingClass,
              className
            )}
          >
            {value ? (
              <span className="truncate">{selectedLabel}</span>
            ) : (
              <span className="truncate text-slate-500 dark:text-slate-400">
                {placeholder}
              </span>
            )}
          </Button>
        </PopoverTrigger>

        <PopoverContent
          className={cn(
            "w-[--radix-popover-trigger-width] p-0",
            // 1. Strict Backgrounds: We enforce colors here on the container
            "bg-white dark:bg-slate-800",
            "border-slate-200 dark:border-slate-700",
            // 2. Overflow Hidden: Prevents square white corners from peeking out of rounded borders
            "overflow-hidden"
          )}
          align="start"
        >
          <Command className="w-full bg-transparent!">
            <CommandInput
              placeholder="Search..."
              className="h-9 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:placeholder:text-slate-400"
            />
            <CommandList>
              <CommandEmpty>{emptyText}</CommandEmpty>
              <CommandGroup>
                {options.map((option) => (
                  <CommandItem
                    key={option.value}
                    value={option.label}
                    onSelect={() => {
                      onChange(option.value === value ? "" : option.value);
                      setOpen(false);
                    }}
                    className="cursor-pointer"
                  >
                    {option.label}
                    <Check
                      className={cn(
                        "ml-auto h-4 w-4 transition-opacity",
                        value === option.value ? "opacity-100" : "opacity-0",
                        activeColor
                      )}
                    />
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  );
}
