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
      outlineBorder: "border border-success-200/80 dark:border-success-800/50",
      outlineIconWrap:
        "bg-success-50 dark:bg-success-950/60 ring-1 ring-success-200/60 dark:ring-success-800/50",
      outlineIcon: "text-success-600 dark:text-success-400",
      outlineTitle: "text-success-700 dark:text-success-400",
      outlineBar: "bg-success-500 dark:bg-success-400",
      outlineBarTrack: "bg-success-100 dark:bg-success-900/50",
      // solid
      solidBg:
        "bg-success-700 dark:bg-success-800 border border-success-600/60 dark:border-success-700/60",
      solidBorder: "",
      solidIconWrap: "bg-white/10 ring-1 ring-white/15",
      solidBar: "bg-white/40",
    },
    error: {
      label: "Error",
      icon: <ExclamationTriangleIcon className="h-4.5 w-4.5" />,
      outlineBg: "bg-white dark:bg-neutral-900",
      outlineBorder: "border border-danger-200/80 dark:border-danger-800/50",
      outlineIconWrap:
        "bg-danger-50 dark:bg-danger-950/60 ring-1 ring-danger-200/60 dark:ring-danger-800/50",
      outlineIcon: "text-danger-600 dark:text-danger-400",
      outlineTitle: "text-danger-700 dark:text-danger-400",
      outlineBar: "bg-danger-500 dark:bg-danger-400",
      outlineBarTrack: "bg-danger-100 dark:bg-danger-900/50",
      solidBg:
        "bg-danger-600 dark:bg-danger-700 border border-danger-500/60 dark:border-danger-600/60",
      solidBorder: "",
      solidIconWrap: "bg-white/10 ring-1 ring-white/15",
      solidBar: "bg-white/40",
    },
    warning: {
      label: "Warning",
      icon: <ExclamationCircleIcon className="h-4.5 w-4.5" />,
      outlineBg: "bg-white dark:bg-neutral-900",
      outlineBorder: "border border-warning-200/80 dark:border-warning-700/50",
      outlineIconWrap:
        "bg-warning-50 dark:bg-warning-950/60 ring-1 ring-warning-200/60 dark:ring-warning-800/50",
      outlineIcon: "text-warning-600 dark:text-warning-400",
      outlineTitle: "text-warning-700 dark:text-warning-400",
      outlineBar: "bg-warning-500 dark:bg-warning-400",
      outlineBarTrack: "bg-warning-100 dark:bg-warning-900/50",
      solidBg:
        "bg-warning-600 dark:bg-warning-700 border border-warning-500/60 dark:border-warning-600/60",
      solidBorder: "",
      solidIconWrap: "bg-white/10 ring-1 ring-white/15",
      solidBar: "bg-white/40",
    },
    info: {
      label: "Info",
      icon: <InformationCircleIcon className="h-4.5 w-4.5" />,
      outlineBg: "bg-white dark:bg-neutral-900",
      outlineBorder: "border border-info-200/80 dark:border-info-800/50",
      outlineIconWrap:
        "bg-info-50 dark:bg-info-950/60 ring-1 ring-info-200/60 dark:ring-info-800/50",
      outlineIcon: "text-info-600 dark:text-info-400",
      outlineTitle: "text-info-700 dark:text-info-400",
      outlineBar: "bg-info-500 dark:bg-info-400",
      outlineBarTrack: "bg-info-100 dark:bg-info-900/50",
      solidBg:
        "bg-info-700 dark:bg-info-800 border border-info-600/60 dark:border-info-700/60",
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
