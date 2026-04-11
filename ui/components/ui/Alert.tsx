import React from "react";
import {
  InformationCircleIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  ExclamationCircleIcon,
} from "@heroicons/react/24/outline";

export type AlertVariant = "info" | "warning" | "success" | "error" | "primary";

interface AlertProps {
  variant?: AlertVariant;
  icon?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}

const configs: Record<
  AlertVariant,
  { container: string; iconColor: string; defaultIcon: React.ReactElement }
> = {
  primary: {
    container: "theme-section-primary text-primary-800 dark:text-primary-200",
    iconColor: "text-primary-600 dark:text-primary-400",
    defaultIcon: <InformationCircleIcon className="size-4" />,
  },
  info: {
    container:
      "border border-sky-200/80 bg-sky-50 text-sky-800 dark:border-sky-800/50 dark:bg-sky-950/30 dark:text-sky-200",
    iconColor: "text-sky-600 dark:text-sky-400",
    defaultIcon: <InformationCircleIcon className="size-4" />,
  },
  warning: {
    container:
      "border border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-800/40 dark:bg-amber-950/30 dark:text-amber-300",
    iconColor: "text-amber-600 dark:text-amber-400",
    defaultIcon: <ExclamationTriangleIcon className="size-4" />,
  },
  error: {
    container:
      "border border-red-200/80 bg-red-50 text-red-800 dark:border-red-800/50 dark:bg-red-950/30 dark:text-red-300",
    iconColor: "text-red-600 dark:text-red-400",
    defaultIcon: <ExclamationCircleIcon className="size-4" />,
  },
  success: {
    container:
      "border border-emerald-200/80 bg-emerald-50 text-emerald-800 dark:border-emerald-800/50 dark:bg-emerald-950/30 dark:text-emerald-300",
    iconColor: "text-emerald-600 dark:text-emerald-400",
    defaultIcon: <CheckCircleIcon className="size-4" />,
  },
};

const Alert: React.FC<AlertProps> = ({
  variant = "info",
  icon,
  children,
  className = "",
}) => {
  const cfg = configs[variant];
  return (
    <div
      role="alert"
      className={`flex items-center gap-3 rounded-xl px-4 py-3 text-sm ${cfg.container} ${className}`}
    >
      <span className={`shrink-0 ${cfg.iconColor}`}>
        {icon ?? cfg.defaultIcon}
      </span>
      <span>{children}</span>
    </div>
  );
};

export default Alert;
