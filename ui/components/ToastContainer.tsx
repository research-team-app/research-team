"use client";

import React from "react";
import { useToastStore } from "@/store/useToastStore";
import Toast from "@/components/ui/Toast";

const positionContainerClasses: Record<string, string> = {
  "top-left": "items-start justify-start",
  "top-center": "items-center justify-start",
  "top-right": "items-end justify-start",
  "bottom-left": "items-start justify-end",
  "bottom-center": "items-center justify-end",
  "bottom-right": "items-end justify-end",
};

const ToastContainer: React.FC = () => {
  const { toasts, removeToast } = useToastStore();

  // Group toasts by position
  const toastsByPosition = toasts.reduce(
    (acc, toast) => {
      const position = toast.position || "top-right";
      if (!acc[position]) {
        acc[position] = [];
      }
      acc[position].push(toast);
      return acc;
    },
    {} as Record<string, typeof toasts>
  );

  return (
    <>
      {Object.entries(toastsByPosition).map(([position, posToasts]) => (
        <div
          key={position}
          className={`pointer-events-none fixed inset-0 z-60 flex p-5 ${positionContainerClasses[position] ?? "items-end justify-end"}`}
        >
          <div className="pointer-events-none flex max-w-90 flex-col gap-2">
            {posToasts.map((toast) => (
              <Toast
                key={toast.id}
                isOpen={true}
                onClose={() => removeToast(toast.id)}
                position="default"
                variant={toast.variant}
                duration={toast.duration}
                appearance={toast.appearance}
                className="pointer-events-auto"
              >
                {toast.message}
              </Toast>
            ))}
          </div>
        </div>
      ))}
    </>
  );
};

export default ToastContainer;
