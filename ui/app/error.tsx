"use client";

import Button from "@/components/ui/Button";
import { useRouter } from "next/navigation";
import { ReactNode } from "react";
import { FaHome } from "react-icons/fa";
import { FiAlertTriangle } from "react-icons/fi";
import { IoArrowBackCircleOutline } from "react-icons/io5";

interface ErrorCardProps {
  title?: string;
  description?: string;
  showRetry?: boolean;
  onRetry?: () => void;
  icon?: ReactNode;
  mode?: "fullscreen" | "half" | "inline";
  className?: string;
}

export default function ErrorCard({
  title = "Error loading Page",
  description,
  showRetry = false,
  onRetry,
  icon = <FiAlertTriangle className="size-8" />,
  mode = "half",
  className = "",
}: ErrorCardProps) {
  const router = useRouter();

  const containerStyles = {
    fullscreen: "min-h-[90vh] w-full py-12",
    half: "min-h-[50vh] w-full py-12",
    inline: "h-auto w-full py-8",
  };

  return (
    <div
      className={`flex flex-col items-center justify-center bg-slate-50 px-4 dark:bg-slate-950 ${containerStyles[mode]} ${className}`}
    >
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm sm:p-10 dark:border-slate-700 dark:bg-slate-900">
        {/* Icon */}
        <div className="mb-6 flex justify-center">
          <div className="bg-danger-50 text-danger-600 dark:text-danger-400 flex h-14 w-14 items-center justify-center rounded-2xl dark:bg-slate-800">
            {icon}
          </div>
        </div>

        {/* Text */}
        <div className="mb-8 space-y-2">
          <h2 className="text-lg font-semibold tracking-tight text-slate-900 dark:text-slate-100">
            {title}
          </h2>
          {description && (
            <p className="text-sm leading-relaxed text-slate-500 dark:text-slate-400">
              {description}
            </p>
          )}
        </div>

        {/* Actions */}
        <div className="flex flex-col items-center justify-center gap-3 sm:flex-row">
          {showRetry && onRetry ? (
            <Button intent="primary" onClick={onRetry}>
              Try Again
            </Button>
          ) : (
            <Button
              startIcon={<FaHome className="size-4" />}
              intent="primary"
              onClick={() => router.push("/")}
            >
              Go to Homepage
            </Button>
          )}

          <Button
            endIcon={<IoArrowBackCircleOutline className="size-4" />}
            variant="outline"
            intent="default"
            onClick={() => router.back()}
          >
            Go Back
          </Button>

          {showRetry && (
            <Button intent="default" size="sm" onClick={() => router.push("/")}>
              Home
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
