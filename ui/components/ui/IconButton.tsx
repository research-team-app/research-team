"use client";

import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from "react";
import clsx from "clsx";
import type { Intent } from "./types";

export type IconButtonSize = "xs" | "sm" | "md" | "lg";
export type IconButtonVariant = "ghost" | "outline" | "solid";

export interface IconButtonProps extends Omit<
  ButtonHTMLAttributes<HTMLButtonElement>,
  "type"
> {
  label: string;
  intent?: Intent;
  variant?: IconButtonVariant;
  size?: IconButtonSize;
  type?: ButtonHTMLAttributes<HTMLButtonElement>["type"];
  children: ReactNode;
}

const sizeClasses: Record<IconButtonSize, string> = {
  xs: "h-7 w-7 [&>*]:h-3.5 [&>*]:w-3.5",
  sm: "h-8 w-8 [&>*]:h-4 [&>*]:w-4",
  md: "h-9 w-9 [&>*]:h-4 [&>*]:w-4",
  lg: "h-10 w-10 [&>*]:h-5 [&>*]:w-5",
};

const ghostIntent: Record<Intent, string> = {
  default:
    "text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white",
  primary:
    "text-primary-600 hover:bg-primary-50 dark:text-primary-400 dark:hover:bg-primary-950/40",
  secondary:
    "text-secondary-600 hover:bg-secondary-50 dark:text-secondary-400 dark:hover:bg-secondary-950/40",
  success:
    "text-success-600 hover:bg-success-50 dark:text-success-400 dark:hover:bg-success-950/40",
  warning:
    "text-warning-600 hover:bg-warning-50 dark:text-warning-400 dark:hover:bg-warning-950/40",
  danger:
    "text-danger-600 hover:bg-danger-50 dark:text-danger-400 dark:hover:bg-danger-950/40",
  info: "text-info-600 hover:bg-info-50 dark:text-info-400 dark:hover:bg-info-950/40",
};

const outlineIntent: Record<Intent, string> = {
  default:
    "border border-slate-300 text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800",
  primary:
    "border border-primary-500 text-primary-600 hover:bg-primary-50 dark:border-primary-500 dark:text-primary-400 dark:hover:bg-primary-950/40",
  secondary:
    "border border-secondary-500 text-secondary-600 hover:bg-secondary-50 dark:border-secondary-500 dark:text-secondary-400 dark:hover:bg-secondary-950/40",
  success:
    "border border-success-500 text-success-600 hover:bg-success-50 dark:border-success-500 dark:text-success-400 dark:hover:bg-success-950/40",
  warning:
    "border border-warning-500 text-warning-600 hover:bg-warning-50 dark:border-warning-500 dark:text-warning-400 dark:hover:bg-warning-950/40",
  danger:
    "border border-danger-500 text-danger-600 hover:bg-danger-50 dark:border-danger-500 dark:text-danger-400 dark:hover:bg-danger-950/40",
  info: "border border-info-500 text-info-600 hover:bg-info-50 dark:border-info-500 dark:text-info-400 dark:hover:bg-info-950/40",
};

const solidIntent: Record<Intent, string> = {
  default:
    "bg-white text-slate-700 border border-slate-300 hover:bg-slate-100 dark:bg-slate-800 dark:text-slate-200 dark:border-slate-700 dark:hover:bg-slate-700",
  primary: "bg-primary-600 text-white hover:bg-primary-700",
  secondary: "bg-secondary-600 text-white hover:bg-secondary-700",
  success: "bg-success-600 text-white hover:bg-success-700",
  warning: "bg-warning-500 text-white hover:bg-warning-600",
  danger: "bg-danger-600 text-white hover:bg-danger-700",
  info: "bg-info-500 text-white hover:bg-info-600",
};

const variantStyles: Record<IconButtonVariant, Record<Intent, string>> = {
  ghost: ghostIntent,
  outline: outlineIntent,
  solid: solidIntent,
};

const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(
  function IconButton(
    {
      label,
      intent = "default",
      variant = "ghost",
      size = "md",
      type = "button",
      className,
      disabled,
      children,
      ...props
    },
    ref
  ) {
    return (
      <button
        ref={ref}
        type={type}
        disabled={disabled}
        aria-label={label}
        title={label}
        className={clsx(
          "inline-flex shrink-0 items-center justify-center rounded-md transition-colors",
          "focus-visible:ring-primary-500 focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none dark:focus-visible:ring-offset-slate-950",
          sizeClasses[size],
          variantStyles[variant][intent],
          disabled && "pointer-events-none cursor-not-allowed opacity-50",
          className
        )}
        {...props}
      >
        {children}
      </button>
    );
  }
);

export default IconButton;
