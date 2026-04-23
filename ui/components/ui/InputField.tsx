import React, { forwardRef, useId, type ReactNode } from "react";
import * as LabelPrimitive from "@radix-ui/react-label";
import clsx from "clsx";
import type { Intent } from "./types";

type Variant = "outline" | "subtle" | "solid";
type Size = "sm" | "md" | "lg";
type Radius = "sm" | "md" | "lg" | "full";

export interface InputFieldProps extends Omit<
  React.ComponentPropsWithoutRef<"input">,
  "size"
> {
  label?: ReactNode;
  description?: ReactNode;
  hint?: ReactNode;
  error?: ReactNode;
  required?: boolean;
  disabled?: boolean;
  intent?: Intent;
  variant?: Variant;
  size?: Size;
  radius?: Radius;
  className?: string;
  inputClassName?: string;
  labelClassName?: string;
  descriptionClassName?: string;
  hintClassName?: string;
  errorClassName?: string;
  startIcon?: ReactNode;
  endIcon?: ReactNode;
  endAdornment?: ReactNode;
}

const sizeClasses: Record<Size, string> = {
  sm: "text-sm py-1.5 px-2",
  md: "text-sm py-2 px-3",
  lg: "text-base py-2.5 px-3.5",
};

const radiusClasses: Record<Radius, string> = {
  sm: "rounded",
  md: "rounded-md",
  lg: "rounded-lg",
  full: "rounded-full",
};

const borderColorByIntent: Record<Intent, string> = {
  default: "border-slate-300 dark:border-slate-500",
  primary: "border-primary-300 dark:border-primary-500/70",
  secondary: "border-secondary-300 dark:border-secondary-500/70",
  success: "border-success-300 dark:border-success-600/70",
  warning: "border-warning-300 dark:border-warning-600/70",
  info: "border-info-300 dark:border-info-600/70",
  danger: "border-danger-300 dark:border-danger-600/70",
};

const focusRingByIntent: Record<Intent, string> = {
  default:
    "focus:outline-none focus:ring-0 focus:border-primary-500 dark:focus:border-primary-400",
  primary:
    "focus:outline-none focus:ring-0 focus:border-primary-500 dark:focus:border-primary-400",
  secondary:
    "focus:outline-none focus:ring-0 focus:border-secondary-500 dark:focus:border-secondary-400",
  success:
    "focus:outline-none focus:ring-0 focus:border-success-500 dark:focus:border-success-400",
  warning:
    "focus:outline-none focus:ring-0 focus:border-warning-500 dark:focus:border-warning-400",
  info: "focus:outline-none focus:ring-0 focus:border-info-500 dark:focus:border-info-400",
  danger:
    "focus:outline-none focus:ring-0 focus:border-danger-500 dark:focus:border-danger-400",
};

const textColorByIntent: Record<Intent, string> = {
  default: "text-slate-900 dark:text-slate-100",
  primary: "text-slate-900 dark:text-slate-100",
  secondary: "text-slate-900 dark:text-slate-100",
  success: "text-slate-900 dark:text-slate-100",
  warning: "text-slate-900 dark:text-slate-100",
  info: "text-slate-900 dark:text-slate-100",
  danger: "text-slate-900 dark:text-slate-100",
};

const bgColorByVariant: Record<Variant, Record<Intent, string>> = {
  outline: {
    default: "bg-white dark:bg-slate-600/20",
    primary: "bg-white dark:bg-slate-900/80",
    secondary: "bg-white dark:bg-slate-900/80",
    success: "bg-white dark:bg-slate-900/80",
    warning: "bg-white dark:bg-slate-900/80",
    info: "bg-white dark:bg-slate-900/80",
    danger: "bg-white dark:bg-slate-900/80",
  },
  subtle: {
    default: "bg-slate-100 dark:bg-slate-800/70",
    primary: "bg-primary-50 dark:bg-primary-900/15",
    secondary: "bg-secondary-50 dark:bg-secondary-900/15",
    success: "bg-success-50 dark:bg-success-900/10",
    warning: "bg-warning-50 dark:bg-warning-900/10",
    info: "bg-info-50 dark:bg-info-900/10",
    danger: "bg-danger-50 dark:bg-danger-900/10",
  },
  solid: {
    default: "bg-white dark:bg-slate-900",
    primary: "bg-white dark:bg-slate-900",
    secondary: "bg-white dark:bg-slate-900",
    success: "bg-white dark:bg-slate-900",
    warning: "bg-white dark:bg-slate-900",
    info: "bg-white dark:bg-slate-900",
    danger: "bg-white dark:bg-slate-900",
  },
};

const errorFocusClasses =
  "border-danger-500 dark:border-danger-500 focus:border-danger-500 dark:focus:border-danger-500 focus:ring-0";

const errorPlaceholderClasses =
  "placeholder:text-danger-500/50 dark:placeholder:text-danger-400/50";

const InputField = forwardRef<HTMLInputElement, InputFieldProps>(
  (
    {
      label,
      description,
      hint,
      error,
      required,
      disabled,
      intent = "default",
      variant = "outline",
      size = "md",
      radius = "md",
      className,
      inputClassName,
      labelClassName,
      descriptionClassName,
      hintClassName,
      errorClassName,
      startIcon,
      endIcon,
      endAdornment,
      id: externalId,
      ...inputProps
    },
    ref
  ) => {
    const generatedId = useId();
    const id = externalId || generatedId;
    const descriptionId = `${id}-description`;
    const errorId = `${id}-error`;
    const hintId = `${id}-hint`;

    const showError = Boolean(error);
    const adornmentPadding = {
      left: startIcon ? "pl-9" : "",
      right: endIcon || endAdornment ? "pr-10" : "",
    };

    const describedBy =
      clsx(
        description && descriptionId,
        showError && errorId,
        !showError && hint && hintId
      ) || undefined;

    return (
      <div className={clsx("flex w-full flex-col", className)}>
        {label && (
          <LabelPrimitive.Root
            htmlFor={id}
            className={clsx(
              "mb-1.5 block text-sm font-medium",
              intent === "primary"
                ? "text-primary-800 dark:text-primary-300"
                : intent === "secondary"
                  ? "text-secondary-800 dark:text-secondary-300"
                  : "text-slate-800 dark:text-slate-200",
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
            id={descriptionId}
            className={clsx(
              "mb-1 text-xs text-slate-500 dark:text-slate-400",
              descriptionClassName
            )}
          >
            {description}
          </p>
        )}

        <div className="relative">
          {startIcon && (
            <span
              className={clsx(
                "pointer-events-none absolute top-1/2 left-3 -translate-y-1/2",
                intent === "primary"
                  ? "text-primary-500/70 dark:text-primary-400/70"
                  : intent === "secondary"
                    ? "text-secondary-500/70 dark:text-secondary-400/70"
                    : intent === "success"
                      ? "text-success-500/70 dark:text-success-400/70"
                      : intent === "warning"
                        ? "text-warning-500/70 dark:text-warning-400/70"
                        : intent === "info"
                          ? "text-info-500/70 dark:text-info-400/70"
                          : intent === "danger"
                            ? "text-danger-500/70 dark:text-danger-400/70"
                            : "text-slate-400 dark:text-slate-500"
              )}
            >
              {startIcon}
            </span>
          )}

          <input
            ref={ref}
            id={id}
            disabled={disabled}
            required={required}
            aria-invalid={showError || undefined}
            aria-describedby={describedBy}
            className={clsx(
              // Base
              "block w-full border-[1.5px] transition-[border-color,box-shadow] duration-150",
              "outline-none",
              // Shape & Size
              radiusClasses[radius],
              sizeClasses[size],
              // Background
              bgColorByVariant[variant][intent],
              // Text Color
              textColorByIntent[intent],
              // Placeholder Color
              !showError &&
                "placeholder:text-slate-400 dark:placeholder:text-slate-400",
              showError && errorPlaceholderClasses,
              // Border & Focus Ring
              !showError && borderColorByIntent[intent],
              !showError && !disabled && focusRingByIntent[intent],
              // Error State
              showError && errorFocusClasses,
              // Adornments
              adornmentPadding.left,
              adornmentPadding.right,
              // Disabled
              disabled && "cursor-not-allowed opacity-60",
              inputClassName
            )}
            {...inputProps}
          />

          {endAdornment ? (
            <span className="absolute top-1/2 right-2 -translate-y-1/2">
              {endAdornment}
            </span>
          ) : endIcon ? (
            <span
              className={clsx(
                "pointer-events-none absolute top-1/2 right-3 -translate-y-1/2",
                intent === "primary"
                  ? "text-primary-500/70 dark:text-primary-400/70"
                  : intent === "secondary"
                    ? "text-secondary-500/70 dark:text-secondary-400/70"
                    : intent === "success"
                      ? "text-success-500/70 dark:text-success-400/70"
                      : intent === "warning"
                        ? "text-warning-500/70 dark:text-warning-400/70"
                        : intent === "info"
                          ? "text-info-500/70 dark:text-info-400/70"
                          : intent === "danger"
                            ? "text-danger-500/70 dark:text-danger-400/70"
                            : "text-slate-400 dark:text-slate-500"
              )}
            >
              {endIcon}
            </span>
          ) : null}
        </div>

        {hint && !showError && (
          <p
            id={hintId}
            className={clsx(
              "mt-1 text-xs text-slate-500 dark:text-slate-400",
              hintClassName
            )}
          >
            {hint}
          </p>
        )}

        {showError && (
          <p
            id={errorId}
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
  }
);

InputField.displayName = "InputField";

export default InputField;
