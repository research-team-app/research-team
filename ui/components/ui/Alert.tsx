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
      "border border-info-200/80 bg-info-50 text-info-800 dark:border-info-800/50 dark:bg-info-950/30 dark:text-info-200",
    iconColor: "text-info-600 dark:text-info-400",
    defaultIcon: <InformationCircleIcon className="size-4" />,
  },
  warning: {
    container:
      "border border-warning-200 bg-warning-50 text-warning-800 dark:border-warning-800/40 dark:bg-warning-950/30 dark:text-warning-300",
    iconColor: "text-warning-600 dark:text-warning-400",
    defaultIcon: <ExclamationTriangleIcon className="size-4" />,
  },
  error: {
    container:
      "border border-danger-200/80 bg-danger-50 text-danger-800 dark:border-danger-800/50 dark:bg-danger-950/30 dark:text-danger-300",
    iconColor: "text-danger-600 dark:text-danger-400",
    defaultIcon: <ExclamationCircleIcon className="size-4" />,
  },
  success: {
    container:
      "border border-success-200/80 bg-success-50 text-success-800 dark:border-success-800/50 dark:bg-success-950/30 dark:text-success-300",
    iconColor: "text-success-600 dark:text-success-400",
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
