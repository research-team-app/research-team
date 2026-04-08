"use client";

import React from "react";
import { useToastStore } from "@/store/useToastStore";
import Toast from "@/components/ui/Toast";

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
          className="pointer-events-none fixed inset-0 z-60 flex"
        >
          {posToasts.map((toast) => (
            <Toast
              key={toast.id}
              isOpen={true}
              onClose={() => removeToast(toast.id)}
              position={toast.position}
              variant={toast.variant}
              duration={toast.duration}
              appearance={toast.appearance}
              className="pointer-events-auto"
            >
              {toast.message}
            </Toast>
          ))}
        </div>
      ))}
    </>
  );
};

export default ToastContainer;
