"use client";

import React, { type ReactNode, useId } from "react";
import * as SelectPrimitive from "@radix-ui/react-select";
import * as LabelPrimitive from "@radix-ui/react-label";
import { CheckIcon, ChevronDownIcon } from "@heroicons/react/16/solid";
import clsx from "clsx";
import type { Intent } from "./types";

type Variant = "outline" | "subtle" | "solid";
type Size = "sm" | "md" | "lg";
type Radius = "sm" | "md" | "lg" | "full";

export interface ListboxOption {
  value: string | number;
  label: string;
  icon?: ReactNode;
  disabled?: boolean;
}

export interface ListboxProps {
  options: ListboxOption[];
  value?: string | number;
  onChange: (value: string | number) => void;
  placeholder?: string;
  label?: ReactNode;
  description?: ReactNode;
  error?: ReactNode;
  disabled?: boolean;
  required?: boolean;
  intent?: Intent;
  variant?: Variant;
  size?: Size;
  radius?: Radius;
  className?: string;
  buttonClassName?: string;
  menuClassName?: string;
  optionClassName?: string;
  labelClassName?: string;
  errorClassName?: string;
  descriptionClassName?: string;
  fullWidth?: boolean;
  name?: string;
  id?: string;
}

const sizeClasses: Record<Size, string> = {
  sm: "text-sm py-1.5 px-2 h-9",
  md: "text-sm py-2 px-3 h-10",
  lg: "text-base py-2.5 px-3.5 h-12",
};

const radiusClasses: Record<Radius, string> = {
  sm: "rounded",
  md: "rounded-md",
  lg: "rounded-lg",
  full: "rounded-full",
};

// Border colors for normal state
const borderColorByIntent: Record<Intent, string> = {
  default: "border-zinc-300 dark:border-zinc-700",
  primary: "border-primary-300 dark:border-primary-500/70",
  secondary: "border-secondary-300 dark:border-secondary-500/70",
  success: "border-success-300 dark:border-success-700",
  warning: "border-warning-300 dark:border-warning-700",
  info: "border-info-300 dark:border-info-700",
  danger: "border-danger-300 dark:border-danger-700",
};

// Border colors for hover state
const hoverBorderColorByIntent: Record<Intent, string> = {
  default: "hover:border-zinc-400 dark:hover:border-zinc-600",
  primary: "hover:border-primary-500 dark:hover:border-primary-400",
  secondary: "hover:border-secondary-500 dark:hover:border-secondary-400",
  success: "hover:border-success-500 dark:hover:border-success-600",
  warning: "hover:border-warning-500 dark:hover:border-warning-600",
  info: "hover:border-info-500 dark:hover:border-info-600",
  danger: "hover:border-danger-500 dark:hover:border-danger-600",
};

// Background colors by variant and intent
const bgColorByVariant: Record<Variant, Record<Intent, string>> = {
  outline: {
    default: "bg-transparent",
    primary: "bg-transparent",
    secondary: "bg-transparent",
    success: "bg-transparent",
    warning: "bg-transparent",
    info: "bg-transparent",
    danger: "bg-transparent",
  },
  subtle: {
    default:
      "bg-zinc-100 dark:bg-white/5 hover:bg-zinc-200/70 dark:hover:bg-white/10",
    primary:
      "bg-primary-50 dark:bg-primary-900/15 hover:bg-primary-100 dark:hover:bg-primary-900/25",
    secondary:
      "bg-secondary-50 dark:bg-secondary-900/15 hover:bg-secondary-100 dark:hover:bg-secondary-900/25",
    success:
      "bg-success-50 dark:bg-success-900/10 hover:bg-success-100 dark:hover:bg-success-900/20",
    warning:
      "bg-warning-50 dark:bg-warning-900/10 hover:bg-warning-100 dark:hover:bg-warning-900/20",
    info: "bg-info-50 dark:bg-info-900/10 hover:bg-info-100 dark:hover:bg-info-900/20",
    danger:
      "bg-danger-50 dark:bg-danger-900/10 hover:bg-danger-100 dark:hover:bg-danger-900/20",
  },
  solid: {
    default:
      "bg-white dark:bg-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-700",
    primary:
      "bg-white dark:bg-zinc-800 hover:bg-primary-50/70 dark:hover:bg-primary-900/20",
    secondary:
      "bg-white dark:bg-zinc-800 hover:bg-secondary-50/70 dark:hover:bg-secondary-900/20",
    success:
      "bg-white dark:bg-zinc-800 hover:bg-success-50/50 dark:hover:bg-success-900/10",
    warning:
      "bg-white dark:bg-zinc-800 hover:bg-warning-50/50 dark:hover:bg-warning-900/10",
    info: "bg-white dark:bg-zinc-800 hover:bg-info-50/50 dark:hover:bg-info-900/10",
    danger:
      "bg-white dark:bg-zinc-800 hover:bg-danger-50/50 dark:hover:bg-danger-900/10",
  },
};

// Text color by intent
const textColorByIntent: Record<Intent, string> = {
  default: "text-zinc-900 dark:text-zinc-100",
  primary: "text-primary-800 dark:text-primary-300",
  secondary: "text-secondary-800 dark:text-secondary-300",
  success: "text-success-700 dark:text-success-400",
  warning: "text-warning-700 dark:text-warning-400",
  info: "text-info-700 dark:text-info-400",
  danger: "text-danger-700 dark:text-danger-400",
};

// Error state colors
const errorClasses = "border-danger-500 text-danger-700 dark:text-danger-400";

const Listbox = ({
  options,
  value,
  onChange,
  placeholder = "Select an option",
  label,
  description,
  error,
  disabled = false,
  required = false,
  intent = "default",
  variant = "outline",
  size = "md",
  radius = "md",
  className,
  buttonClassName,
  menuClassName,
  optionClassName,
  labelClassName,
  errorClassName,
  descriptionClassName,
  fullWidth = false,
  name,
  id: externalId,
}: ListboxProps) => {
  const generatedId = useId();
  const id = externalId || generatedId;
  const showError = Boolean(error);

  // Find selected option object to render custom content in trigger
  const selectedOption = options.find((option) => option.value === value);

  // Radix expects string values. We handle the conversion here.
  const handleValueChange = (newValue: string) => {
    // Find the original option to get the correct type (number or string)
    const option = options.find((o) => String(o.value) === newValue);
    if (option) {
      onChange(option.value);
    }
  };

  return (
    <div className={clsx("flex flex-col", fullWidth && "w-full", className)}>
      {label && (
        <LabelPrimitive.Root
          htmlFor={id}
          className={clsx(
            "mb-1.5 block text-sm font-medium",
            intent === "primary"
              ? "text-primary-800 dark:text-primary-300"
              : intent === "secondary"
                ? "text-secondary-800 dark:text-secondary-300"
                : intent === "info"
                  ? "text-info-800 dark:text-info-300"
                  : "text-zinc-800 dark:text-zinc-200",
            disabled && "cursor-not-allowed opacity-60",
            labelClassName
          )}
        >
          <span className="align-middle">{label}</span>
          {required && (
            <span className="text-danger-600 dark:text-danger-400 ml-1 align-middle">
              *
            </span>
          )}
        </LabelPrimitive.Root>
      )}

      {description && (
        <p
          className={clsx(
            "mb-1 text-xs text-zinc-600 dark:text-zinc-400",
            descriptionClassName
          )}
        >
          {description}
        </p>
      )}

      <SelectPrimitive.Root
        value={value?.toString()}
        onValueChange={handleValueChange}
        disabled={disabled}
        required={required}
        name={name}
      >
        <SelectPrimitive.Trigger
          id={id}
          className={clsx(
            "group relative flex w-full items-center justify-between transition-all duration-200",
            "border",
            sizeClasses[size],
            radiusClasses[radius],
            // Background color
            bgColorByVariant[variant][intent],
            // Border colors
            !showError && borderColorByIntent[intent],
            !showError && !disabled && hoverBorderColorByIntent[intent],
            // Text colors
            textColorByIntent[intent],
            // Error state
            showError && errorClasses,
            // States
            "outline-none focus:outline-none",
            disabled && "cursor-not-allowed opacity-60",
            fullWidth && "w-full",
            // Shadow for solid variant
            variant === "solid" && "shadow-sm",
            buttonClassName
          )}
        >
          <span
            className={clsx(
              "block truncate",
              !selectedOption && "text-zinc-500 dark:text-zinc-400"
            )}
          >
            {/* We manually render the content here to support Icons + Text.
              SelectPrimitive.Value is still needed for accessible value readout.
            */}
            <SelectPrimitive.Value>
              <span>
                {selectedOption ? (
                  <div className="flex items-center gap-2">
                    {selectedOption.icon && (
                      <span className="flex-shrink-0">
                        {selectedOption.icon}
                      </span>
                    )}
                    <span>{selectedOption.label}</span>
                  </div>
                ) : (
                  placeholder
                )}
              </span>
            </SelectPrimitive.Value>
          </span>

          <SelectPrimitive.Icon className="pointer-events-none ml-2 flex items-center">
            <ChevronDownIcon
              className={clsx(
                "h-4 w-4 transition-transform duration-200",
                "group-data-[state=open]:rotate-180",
                intent === "primary"
                  ? "text-primary-500/70 dark:text-primary-400/70"
                  : intent === "secondary"
                    ? "text-secondary-500/70 dark:text-secondary-400/70"
                    : intent === "info"
                      ? "text-info-500/70 dark:text-info-400/70"
                      : "text-zinc-500 dark:text-zinc-400"
              )}
              aria-hidden="true"
            />
          </SelectPrimitive.Icon>
        </SelectPrimitive.Trigger>

        <SelectPrimitive.Portal>
          <SelectPrimitive.Content
            position="popper"
            sideOffset={4}
            className={clsx(
              "z-50 max-h-60 overflow-hidden",
              radiusClasses[radius],
              "bg-white shadow-lg dark:bg-zinc-800",
              "border border-zinc-200 dark:border-zinc-700",
              // Width handling for popper
              "w-full min-w-[var(--radix-select-trigger-width)]",
              // Animations
              "data-[state=open]:animate-in data-[state=closed]:animate-out",
              "data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
              "data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95",
              menuClassName
            )}
          >
            <SelectPrimitive.Viewport className="p-1">
              {options.length === 0 ? (
                <div className="px-3 py-2 text-sm text-zinc-500 dark:text-zinc-400">
                  No options available
                </div>
              ) : (
                options.map((option) => (
                  <SelectPrimitive.Item
                    key={option.value}
                    value={String(option.value)}
                    disabled={option.disabled}
                    className={clsx(
                      "relative flex w-full cursor-default items-center justify-between rounded-sm px-3 py-2 text-sm outline-none select-none",
                      // Highlighted state (equivalent to active)
                      intent === "primary"
                        ? "data-[highlighted]:bg-primary-50 dark:data-[highlighted]:bg-primary-900/30"
                        : intent === "secondary"
                          ? "data-[highlighted]:bg-secondary-50 dark:data-[highlighted]:bg-secondary-900/30"
                          : intent === "info"
                            ? "data-[highlighted]:bg-info-50 dark:data-[highlighted]:bg-info-900/30"
                            : "data-[highlighted]:bg-zinc-100 dark:data-[highlighted]:bg-zinc-700",
                      // Selected state
                      intent === "primary"
                        ? "data-[state=checked]:bg-primary-100 dark:data-[state=checked]:bg-primary-900/40"
                        : intent === "secondary"
                          ? "data-[state=checked]:bg-secondary-100 dark:data-[state=checked]:bg-secondary-900/40"
                          : intent === "info"
                            ? "data-[state=checked]:bg-info-100 dark:data-[state=checked]:bg-info-900/40"
                            : "data-[state=checked]:bg-zinc-200 dark:data-[state=checked]:bg-zinc-600",

                      option.disabled && "pointer-events-none opacity-50",
                      optionClassName
                    )}
                  >
                    <SelectPrimitive.ItemText>
                      <div className="flex items-center gap-2">
                        {option.icon && (
                          <span className="shrink-0">{option.icon}</span>
                        )}
                        <span className="block truncate">{option.label}</span>
                      </div>
                    </SelectPrimitive.ItemText>

                    <SelectPrimitive.ItemIndicator>
                      <CheckIcon
                        className={clsx(
                          "h-4 w-4",
                          intent === "primary"
                            ? "text-primary-600 dark:text-primary-400"
                            : intent === "secondary"
                              ? "text-secondary-600 dark:text-secondary-400"
                              : intent === "info"
                                ? "text-info-600 dark:text-info-400"
                                : "text-zinc-700 dark:text-zinc-300"
                        )}
                      />
                    </SelectPrimitive.ItemIndicator>
                  </SelectPrimitive.Item>
                ))
              )}
            </SelectPrimitive.Viewport>
          </SelectPrimitive.Content>
        </SelectPrimitive.Portal>
      </SelectPrimitive.Root>

      {error && (
        <p
          className={clsx(
            "text-danger-600 dark:text-danger-400 mt-1 text-xs",
            errorClassName
          )}
        >
          {error}
        </p>
      )}
    </div>
  );
};

export default Listbox;
