"use client";

import React, { type ReactNode } from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { XMarkIcon } from "@heroicons/react/24/outline";
import clsx from "clsx";

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  maxWidth?:
    | "xs"
    | "sm"
    | "md"
    | "lg"
    | "xl"
    | "2xl"
    | "3xl"
    | "4xl"
    | "5xl"
    | "full";
  closeOnOverlayClick?: boolean;
  showCloseButton?: boolean;
  initialFocus?: React.MutableRefObject<HTMLElement | null>;
  className?: string;
  overlayClassName?: string;
}

const maxWidthClasses = {
  xs: "max-w-xs",
  sm: "max-w-sm",
  md: "max-w-md",
  lg: "max-w-lg",
  xl: "max-w-xl",
  "2xl": "max-w-2xl",
  "3xl": "max-w-3xl",
  "4xl": "max-w-4xl",
  "5xl": "max-w-5xl",
  full: "max-w-full",
};

const Modal = ({
  isOpen,
  onClose,
  title,
  children,
  footer,
  maxWidth = "md",
  closeOnOverlayClick = true,
  showCloseButton = true,
  initialFocus,
  className,
  overlayClassName,
}: ModalProps) => {
  return (
    <DialogPrimitive.Root
      open={isOpen}
      onOpenChange={(open) => {
        // Only trigger onClose when the dialog is trying to close (open becomes false)
        if (!open) {
          onClose();
        }
      }}
    >
      <DialogPrimitive.Portal>
        {/* Overlay */}
        <DialogPrimitive.Overlay
          className={clsx(
            "fixed inset-0 z-50 bg-black/50 backdrop-blur-sm",
            // Animation classes
            "data-[state=open]:animate-in data-[state=closed]:animate-out",
            "data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
            "data-[state=closed]:pointer-events-none data-[state=closed]:invisible",
            overlayClassName
          )}
        />

        {/* Content Wrapper */}
        <DialogPrimitive.Content
          // Handle initial focus
          onOpenAutoFocus={(e) => {
            if (initialFocus?.current) {
              e.preventDefault();
              initialFocus.current.focus();
            }
          }}
          // Handle clicking outside (overlay)
          onInteractOutside={(e) => {
            if (!closeOnOverlayClick) {
              e.preventDefault();
            }
          }}
          className={clsx(
            "fixed top-[50%] left-[50%] z-50 grid w-full translate-x-[-50%] translate-y-[-50%] gap-4 border bg-white p-6 shadow-xl duration-200 sm:rounded-lg dark:border-zinc-800 dark:bg-zinc-900",
            // Max Width logic
            maxWidthClasses[maxWidth],
            // Animations
            "data-[state=open]:animate-in data-[state=closed]:animate-out",
            "data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
            "data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95",
            "data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%]",
            "data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%]",
            "data-[state=closed]:pointer-events-none data-[state=closed]:invisible",
            className
          )}
        >
          {/* Header Section */}
          {(title || showCloseButton) && (
            <div className="mb-2 flex items-center justify-between">
              {title ? (
                <DialogPrimitive.Title className="text-lg leading-6 font-medium text-slate-900 dark:text-white">
                  {title}
                </DialogPrimitive.Title>
              ) : (
                // Spacer if no title but close button exists, to align button right
                <span />
              )}

              {showCloseButton && (
                <DialogPrimitive.Close asChild>
                  <button
                    type="button"
                    className="ring-offset-background rounded-sm text-slate-500 opacity-70 transition-opacity hover:opacity-100 focus:ring-2 focus:ring-zinc-400 focus:ring-offset-2 focus:outline-none disabled:pointer-events-none data-[state=open]:bg-zinc-100 dark:text-slate-400 dark:focus:ring-zinc-800"
                  >
                    <XMarkIcon className="h-5 w-5" />
                    <span className="sr-only">Close</span>
                  </button>
                </DialogPrimitive.Close>
              )}
            </div>
          )}

          {/* Body */}
          <div className="relative">{children}</div>

          {/* Footer */}
          {footer && (
            <div className="mt-6 flex justify-end gap-x-2">{footer}</div>
          )}
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
};

export default Modal;
