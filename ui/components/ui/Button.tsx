"use client";

import {
  forwardRef,
  type ReactNode,
  type AnchorHTMLAttributes,
  type ButtonHTMLAttributes,
} from "react";
import clsx from "clsx";
import { FaSpinner } from "react-icons/fa";
import type { Intent as SharedIntent } from "./types";

export type Intent = SharedIntent;

export type Variant = "solid" | "outline" | "link";
export type Size = "xs" | "sm" | "md" | "lg" | "xl";

export interface ButtonProps extends Omit<
  ButtonHTMLAttributes<HTMLButtonElement>,
  "type"
> {
  intent?: Intent;
  variant?: Variant;
  size?: Size;
  startIcon?: ReactNode;
  endIcon?: ReactNode;
  loading?: boolean;
  fullWidth?: boolean;
  href?: string;
  target?: AnchorHTMLAttributes<HTMLAnchorElement>["target"];
  type?: ButtonHTMLAttributes<HTMLButtonElement>["type"];
}

//  SOLID STYLES
const solidStyles: Record<Intent, string> = {
  default:
    "bg-white text-slate-700 border border-slate-300 shadow-sm " +
    "hover:bg-slate-100 hover:border-slate-400 active:bg-slate-200 " +
    "dark:bg-slate-800 dark:text-slate-200 dark:border-slate-700 dark:hover:bg-slate-700 dark:active:bg-slate-600",
  primary:
    "bg-primary-600 text-white border border-transparent shadow-sm hover:bg-primary-700 active:bg-primary-800 dark:hover:bg-primary-500",
  secondary:
    "bg-secondary-600 text-white border border-transparent shadow-sm hover:bg-secondary-700 active:bg-secondary-800 dark:hover:bg-secondary-500",
  success:
    "bg-success-600 text-white border border-transparent shadow-sm hover:bg-success-700 active:bg-success-800 dark:hover:bg-success-500",
  warning:
    "bg-warning-500 text-white border border-transparent shadow-sm hover:bg-warning-600 active:bg-warning-700 dark:hover:bg-warning-400",
  danger:
    "bg-danger-600 text-white border border-transparent shadow-sm hover:bg-danger-700 active:bg-danger-800 dark:hover:bg-danger-500",
  info: "bg-info-500 text-white border border-transparent shadow-sm hover:bg-info-600 active:bg-info-700 dark:hover:bg-info-400",
};

// OUTLINE STYLES
const outlineStyles: Record<Intent, string> = {
  default:
    "bg-transparent text-slate-700 border border-slate-300 " +
    "hover:bg-slate-100 hover:border-slate-400 hover:text-slate-900 active:bg-slate-200 " +
    "dark:text-slate-300 dark:border-slate-600 dark:hover:bg-slate-800 dark:hover:border-slate-500 dark:hover:text-white dark:active:bg-slate-700",
  primary:
    "bg-transparent text-primary-600 border border-primary-500 " +
    "hover:bg-primary-600 hover:text-white hover:border-primary-600 active:bg-primary-700 active:border-primary-700 " +
    "dark:text-primary-400 dark:border-primary-500 dark:hover:bg-primary-600 dark:hover:text-white dark:active:bg-primary-700",
  secondary:
    "bg-transparent text-secondary-600 border border-secondary-500 " +
    "hover:bg-secondary-600 hover:text-white hover:border-secondary-600 active:bg-secondary-700 active:border-secondary-700 " +
    "dark:text-secondary-400 dark:border-secondary-500 dark:hover:bg-secondary-600 dark:hover:text-white dark:active:bg-secondary-700",
  success:
    "bg-transparent text-success-600 border border-success-500 " +
    "hover:bg-success-600 hover:text-white hover:border-success-600 active:bg-success-700 " +
    "dark:text-success-400 dark:border-success-500 dark:hover:bg-success-600 dark:hover:text-white dark:active:bg-success-700",
  warning:
    "bg-transparent text-warning-600 border border-warning-500 " +
    "hover:bg-warning-600 hover:text-white hover:border-warning-600 active:bg-warning-700 " +
    "dark:text-warning-400 dark:border-warning-500 dark:hover:bg-warning-600 dark:hover:text-white dark:active:bg-warning-700",
  danger:
    "bg-transparent text-danger-600 border border-danger-200 " +
    "hover:bg-danger-50 hover:border-danger-300 hover:text-danger-700 active:bg-danger-100 active:border-danger-400 " +
    "dark:text-danger-400 dark:border-danger-400 dark:hover:bg-danger-950/40 dark:hover:border-danger-700/60 dark:hover:text-danger-300 dark:active:bg-danger-950/60",
  info:
    "bg-transparent text-info-600 border border-info-500 " +
    "hover:bg-info-600 hover:text-white hover:border-info-600 active:bg-info-700 " +
    "dark:text-info-400 dark:border-info-500 dark:hover:bg-info-600 dark:hover:text-white dark:active:bg-info-700",
};

// 3. LINK STYLES
const linkStyles: Record<Intent, string> = {
  default:
    "text-slate-600 hover:text-slate-900 hover:underline dark:text-slate-400 dark:hover:text-white",
  primary:
    "text-primary-600 hover:text-primary-700 hover:underline dark:text-primary-400 dark:hover:text-primary-300",
  secondary:
    "text-secondary-600 hover:text-secondary-700 hover:underline dark:text-secondary-400 dark:hover:text-secondary-300",
  success:
    "text-success-600 hover:text-success-700 hover:underline dark:text-success-400 dark:hover:text-success-300",
  warning:
    "text-warning-600 hover:text-warning-700 hover:underline dark:text-warning-400 dark:hover:text-warning-300",
  danger:
    "text-danger-600 hover:text-danger-700 hover:underline dark:text-danger-400 dark:hover:text-danger-300",
  info: "text-info-600 hover:text-info-700 hover:underline dark:text-info-400 dark:hover:text-info-300",
};

const variantStyles = {
  solid: solidStyles,
  outline: outlineStyles,
  link: linkStyles,
};

type ButtonElement = HTMLButtonElement | HTMLAnchorElement;

const Button = forwardRef<ButtonElement, ButtonProps>(function Button(
  {
    intent = "default",
    variant = "solid",
    size = "md",
    startIcon,
    endIcon,
    loading = false,
    fullWidth = false,
    disabled = false,
    className,
    children,
    href,
    target,
    type = "button",
    role,
    onClick,
    ...props
  },
  ref
) {
  const isDisabled = disabled || loading;
  const isExternal = href?.startsWith("http");
  const isCombobox = role === "combobox";

  const getSizeClass = () => {
    if (variant === "link") {
      switch (size) {
        case "xs":
          return "text-[11px] gap-1";
        case "sm":
          return "text-xs gap-1.5";
        case "lg":
          return "text-base gap-2.5";
        case "xl":
          return "text-lg gap-3";
        default:
          return "text-sm gap-2";
      }
    }
    switch (size) {
      case "xs":
        return "text-[11px] font-semibold px-2 py-1 gap-1";
      case "sm":
        return "text-xs font-semibold px-2.5 py-1.5 gap-1.5";
      case "lg":
        return "text-base font-semibold px-5 py-2.5 gap-2.5";
      case "xl":
        return "text-lg font-semibold px-6 py-3.5 gap-3";
      default:
        return "text-sm font-semibold px-4 py-2 gap-2";
    }
  };

  const baseClass = clsx(
    "relative inline-flex items-center rounded-lg transition-all duration-200 cursor-pointer select-none",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-primary-500",
    "dark:focus-visible:ring-offset-slate-950",

    // Combobox Alignment
    isCombobox ? "justify-between" : "justify-center",

    getSizeClass(),
    variantStyles[variant][intent],
    isDisabled && "opacity-60 cursor-not-allowed pointer-events-none",
    fullWidth && "w-full",
    className
  );

  const content = (
    <>
      {!loading && startIcon && (
        <span className="inline-flex shrink-0">{startIcon}</span>
      )}

      {/* Text Container */}
      <span
        className={clsx(
          "truncate",
          isCombobox && "flex-1 text-left",
          loading && "opacity-0"
        )}
      >
        {children}
      </span>

      {loading && (
        <span
          className="absolute inset-0 flex items-center justify-center"
          aria-hidden
        >
          <FaSpinner className="h-5 w-5 animate-spin" />
        </span>
      )}
      {!loading && endIcon && (
        <span className="inline-flex shrink-0">{endIcon}</span>
      )}
    </>
  );

  if (href && !isDisabled) {
    return (
      <a
        href={href}
        ref={ref as React.Ref<HTMLAnchorElement>}
        className={baseClass}
        target={target}
        rel={isExternal ? "noopener noreferrer" : undefined}
        onClick={(e) => {
          const anchorClick =
            onClick as unknown as React.MouseEventHandler<HTMLAnchorElement>;
          anchorClick?.(e);
        }}
        role={role}
      >
        {content}
      </a>
    );
  }

  return (
    <button
      ref={ref as React.Ref<HTMLButtonElement>}
      type={type}
      disabled={isDisabled}
      className={baseClass}
      onClick={onClick}
      role={role}
      {...props}
    >
      {content}
    </button>
  );
});

export default Button;
