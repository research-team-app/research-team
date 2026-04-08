import { create } from "zustand";

export type ToastVariant = "success" | "info" | "error" | "warning";
export type ToastPosition =
  | "top-left"
  | "top-center"
  | "top-right"
  | "bottom-left"
  | "bottom-center"
  | "bottom-right";

interface Toast {
  id: string;
  message: string;
  variant: ToastVariant;
  position: ToastPosition;
  duration?: number;
  appearance?: "outline" | "solid";
}

interface ToastState {
  toasts: Toast[];
  addToast: (
    message: string,
    options?: {
      variant?: ToastVariant;
      position?: ToastPosition;
      duration?: number;
      appearance?: "outline" | "solid";
    }
  ) => void;
  removeToast: (id: string) => void;
  clearToasts: () => void;
}

export const useToastStore = create<ToastState>((set) => ({
  toasts: [],

  addToast: (message, options = {}) => {
    const {
      variant = "info",
      position = "top-right",
      duration = 5000,
      appearance = "solid",
    } = options;
    const id = `${Date.now()}-${Math.random()}`;

    set((state) => ({
      toasts: [
        ...state.toasts,
        { id, message, variant, position, duration, appearance },
      ],
    }));

    // Auto-remove toast after duration
    if (duration > 0) {
      setTimeout(() => {
        set((state) => ({
          toasts: state.toasts.filter((t) => t.id !== id),
        }));
      }, duration);
    }
  },

  removeToast: (id) => {
    set((state) => ({
      toasts: state.toasts.filter((t) => t.id !== id),
    }));
  },

  clearToasts: () => {
    set({ toasts: [] });
  },
}));
