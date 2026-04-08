import React, { useEffect, useState, useCallback } from "react";
import {
  XMarkIcon,
  CheckCircleIcon,
  InformationCircleIcon,
  ExclamationTriangleIcon,
  ExclamationCircleIcon,
} from "@heroicons/react/24/outline";

export type ToastPosition =
  | "top-left"
  | "top-center"
  | "top-right"
  | "bottom-left"
  | "bottom-center"
  | "bottom-right"
  | "default";

export type ToastVariant = "success" | "info" | "error" | "warning";
export type ToastAppearance = "outline" | "solid";

export interface ToastProps {
  children: React.ReactNode;
  isOpen: boolean;
  onClose: () => void;
  position?: ToastPosition;
  variant?: ToastVariant;
  appearance?: ToastAppearance;
  /** Auto-close after this many ms. Default 15000 (15s). Set 0 to disable. */
  duration?: number;
  className?: string;
  /** Optional title override. If not set, variant label is used. */
  title?: string;
}

const positionClasses: Record<ToastPosition, string> = {
  "top-left": "top-5 left-5",
  "top-center": "top-5 left-1/2 -translate-x-1/2",
  "top-right": "top-5 right-5",
  "bottom-left": "bottom-5 left-5",
  "bottom-center": "bottom-5 left-1/2 -translate-x-1/2",
  "bottom-right": "bottom-5 right-5",
  default: "",
};

const DEFAULT_DURATION = 15000;

const Toast: React.FC<ToastProps> = ({
  children,
  isOpen,
  onClose,
  position = "top-right",
  variant = "info",
  appearance = "outline",
  duration = DEFAULT_DURATION,
  className = "",
  title: titleProp,
}) => {
  const [isExiting, setIsExiting] = useState(false);
  const [progress, setProgress] = useState(100);

  const closeToast = useCallback(() => {
    setIsExiting(true);
    setTimeout(() => {
      setIsExiting(false);
      onClose();
    }, 350);
  }, [onClose]);

  useEffect(() => {
    if (!isOpen || isExiting || !duration || duration <= 0) return;
    const start = Date.now();
    const interval = setInterval(() => {
      const elapsed = Date.now() - start;
      const remaining = Math.max(0, 100 - (elapsed / duration) * 100);
      setProgress(remaining);
      if (remaining <= 0) {
        clearInterval(interval);
        closeToast();
      }
    }, 50);
    const timer = setTimeout(closeToast, duration);
    return () => {
      clearTimeout(timer);
      clearInterval(interval);
    };
  }, [isOpen, isExiting, duration, closeToast]);

  if (!isOpen && !isExiting) return null;

  /* ─── Variant Config ─────────────────────────────────────────── */
  type VariantConfig = {
    label: string;
    icon: React.ReactElement;
    /* outline */
    outlineBg: string;
    outlineBorder: string;
    outlineIconWrap: string;
    outlineIcon: string;
    outlineTitle: string;
    outlineBar: string;
    outlineBarTrack: string;
    /* solid */
    solidBg: string;
    solidBorder: string;
    solidIconWrap: string;
    solidBar: string;
  };

  const configs: Record<ToastVariant, VariantConfig> = {
    success: {
      label: "Success",
      icon: <CheckCircleIcon className="h-[18px] w-[18px]" />,
      // outline
      outlineBg: "bg-white dark:bg-neutral-900",
      outlineBorder: "border border-emerald-200/80 dark:border-emerald-800/50",
      outlineIconWrap:
        "bg-emerald-50 dark:bg-emerald-950/60 ring-1 ring-emerald-200/60 dark:ring-emerald-800/50",
      outlineIcon: "text-emerald-600 dark:text-emerald-400",
      outlineTitle: "text-emerald-700 dark:text-emerald-400",
      outlineBar: "bg-emerald-500 dark:bg-emerald-400",
      outlineBarTrack: "bg-emerald-100 dark:bg-emerald-900/50",
      // solid
      solidBg:
        "bg-emerald-700 dark:bg-emerald-800 border border-emerald-600/60 dark:border-emerald-700/60",
      solidBorder: "",
      solidIconWrap: "bg-white/10 ring-1 ring-white/15",
      solidBar: "bg-white/40",
    },
    error: {
      label: "Error",
      icon: <ExclamationTriangleIcon className="h-4.5 w-4.5" />,
      outlineBg: "bg-white dark:bg-neutral-900",
      outlineBorder: "border border-red-200/80 dark:border-red-800/50",
      outlineIconWrap:
        "bg-red-50 dark:bg-red-950/60 ring-1 ring-red-200/60 dark:ring-red-800/50",
      outlineIcon: "text-red-600 dark:text-red-400",
      outlineTitle: "text-red-700 dark:text-red-400",
      outlineBar: "bg-red-500 dark:bg-red-400",
      outlineBarTrack: "bg-red-100 dark:bg-red-900/50",
      solidBg:
        "bg-red-700 dark:bg-red-800 border border-red-600/60 dark:border-red-700/60",
      solidBorder: "",
      solidIconWrap: "bg-white/10 ring-1 ring-white/15",
      solidBar: "bg-white/40",
    },
    warning: {
      label: "Warning",
      icon: <ExclamationCircleIcon className="h-4.5 w-4.5" />,
      outlineBg: "bg-white dark:bg-neutral-900",
      outlineBorder: "border border-amber-200/80 dark:border-amber-700/50",
      outlineIconWrap:
        "bg-amber-50 dark:bg-amber-950/60 ring-1 ring-amber-200/60 dark:ring-amber-800/50",
      outlineIcon: "text-amber-600 dark:text-amber-400",
      outlineTitle: "text-amber-700 dark:text-amber-400",
      outlineBar: "bg-amber-500 dark:bg-amber-400",
      outlineBarTrack: "bg-amber-100 dark:bg-amber-900/50",
      solidBg:
        "bg-amber-600 dark:bg-amber-700 border border-amber-500/60 dark:border-amber-600/60",
      solidBorder: "",
      solidIconWrap: "bg-white/10 ring-1 ring-white/15",
      solidBar: "bg-white/40",
    },
    info: {
      label: "Info",
      icon: <InformationCircleIcon className="h-4.5 w-4.5" />,
      outlineBg: "bg-white dark:bg-neutral-900",
      outlineBorder: "border border-sky-200/80 dark:border-sky-800/50",
      outlineIconWrap:
        "bg-sky-50 dark:bg-sky-950/60 ring-1 ring-sky-200/60 dark:ring-sky-800/50",
      outlineIcon: "text-sky-600 dark:text-sky-400",
      outlineTitle: "text-sky-700 dark:text-sky-400",
      outlineBar: "bg-sky-500 dark:bg-sky-400",
      outlineBarTrack: "bg-sky-100 dark:bg-sky-900/50",
      solidBg:
        "bg-sky-700 dark:bg-sky-800 border border-sky-600/60 dark:border-sky-700/60",
      solidBorder: "",
      solidIconWrap: "bg-white/10 ring-1 ring-white/15",
      solidBar: "bg-white/40",
    },
  };

  const cfg = configs[variant];
  const title = titleProp ?? cfg.label;
  const isSolid = appearance === "solid";

  /* ─── Transition states ─────────────────────────────────────── */
  const enterClass = isExiting
    ? "opacity-0 translate-y-[-6px] scale-[0.97]"
    : "opacity-100 translate-y-0 scale-100";

  const isFixed = position !== "default";

  return (
    <div
      className={`${isFixed ? `fixed z-50 w-full max-w-90 ${positionClasses[position]}` : "w-full"} ${className}`}
      style={
        isFixed
          ? {
              filter:
                "drop-shadow(0 8px 24px rgba(0,0,0,0.10)) drop-shadow(0 2px 6px rgba(0,0,0,0.07))",
            }
          : undefined
      }
      role="alert"
      aria-live="polite"
    >
      <div
        className={`relative overflow-hidden rounded-2xl transition-all duration-300 ease-[cubic-bezier(0.23,1,0.32,1)] ${enterClass} ${
          isSolid ? cfg.solidBg : `${cfg.outlineBg} ${cfg.outlineBorder}`
        } `}
        style={
          !isSolid
            ? {
                boxShadow:
                  "0 0 0 1px rgba(0,0,0,0.04), 0 4px 16px rgba(0,0,0,0.08), 0 1px 3px rgba(0,0,0,0.05)",
              }
            : {
                boxShadow:
                  "0 4px 20px rgba(0,0,0,0.18), 0 1px 4px rgba(0,0,0,0.12)",
              }
        }
      >
        {/* ── Body ─────────────────────────────────────────────── */}
        <div className="flex items-start gap-3.5 px-4 pt-4 pb-3.5">
          {/* Icon pill */}
          <div
            className={`mt-px flex h-8 w-8 shrink-0 items-center justify-center rounded-xl ${isSolid ? cfg.solidIconWrap : cfg.outlineIconWrap} `}
            aria-hidden
          >
            <span className={isSolid ? "text-white" : cfg.outlineIcon}>
              {cfg.icon}
            </span>
          </div>

          {/* Text */}
          <div className="min-w-0 flex-1 pt-0.5">
            <p
              className={`mb-1 text-[11px] leading-none font-semibold tracking-[0.07em] uppercase ${isSolid ? "text-white/70" : cfg.outlineTitle} `}
            >
              {title}
            </p>
            <p
              className={`text-[13.5px] leading-snug font-medium ${
                isSolid
                  ? "text-white"
                  : "text-neutral-800 dark:text-neutral-100"
              } `}
            >
              {children}
            </p>
          </div>

          {/* Close button */}
          <button
            type="button"
            onClick={closeToast}
            className={`-mt-0.5 -mr-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-xl transition-all duration-150 ${
              isSolid
                ? "text-white/60 hover:bg-white/12 hover:text-white active:bg-white/20"
                : "text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700 active:scale-95 dark:text-neutral-500 dark:hover:bg-white/8 dark:hover:text-neutral-200"
            } `}
            aria-label="Dismiss notification"
          >
            <XMarkIcon className="h-4 w-4" />
          </button>
        </div>

        {/* ── Progress bar ─────────────────────────────────────── */}
        {duration > 0 && (
          <div
            className={`h-[3px] w-full ${isSolid ? "bg-white/15" : cfg.outlineBarTrack} `}
            aria-hidden
          >
            <div
              className={`h-full rounded-full transition-[width] duration-75 ease-linear ${isSolid ? cfg.solidBar : cfg.outlineBar} `}
              style={{ width: `${progress}%` }}
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default Toast;
