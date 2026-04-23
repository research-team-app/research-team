import React, {
  forwardRef,
  useCallback,
  useEffect,
  useId,
  useRef,
  type ReactNode,
} from "react";
import * as LabelPrimitive from "@radix-ui/react-label";
import clsx from "clsx";
import type { Intent } from "./types";

type Variant = "outline" | "subtle" | "solid";
type Size = "sm" | "md" | "lg";
type Radius = "sm" | "md" | "lg";

export interface TextAreaFieldProps extends Omit<
  React.ComponentPropsWithoutRef<"textarea">,
  "size"
> {
  label?: ReactNode;
  description?: ReactNode;
  hint?: ReactNode;
  error?: ReactNode;
  required?: boolean;
  disabled?: boolean;
  intent?: Intent;
  variant?: Variant;
  size?: Size;
  radius?: Radius;
  className?: string;
  textareaClassName?: string;
  labelClassName?: string;
  descriptionClassName?: string;
  hintClassName?: string;
  errorClassName?: string;
  resize?: "none" | "vertical" | "horizontal" | "both";
  autoGrow?: boolean;
}

const sizeClasses: Record<Size, string> = {
  sm: "text-sm py-1.5 px-2 min-h-[80px]",
  md: "text-sm py-2 px-3 min-h-[100px]",
  lg: "text-base py-2.5 px-3.5 min-h-[120px]",
};

const radiusClasses: Record<Radius, string> = {
  sm: "rounded",
  md: "rounded-md",
  lg: "rounded-lg",
};

const resizeClasses = {
  none: "resize-none",
  vertical: "resize-y",
  horizontal: "resize-x",
  both: "resize",
};

const borderColorByIntent: Record<Intent, string> = {
  default: "border-slate-300 dark:border-slate-600",
  primary: "border-primary-300 dark:border-primary-500/70",
  secondary: "border-secondary-300 dark:border-secondary-500/70",
  success: "border-success-300 dark:border-success-600/70",
  warning: "border-warning-300 dark:border-warning-600/70",
  info: "border-info-300 dark:border-info-600/70",
  danger: "border-danger-300 dark:border-danger-600/70",
};

const focusRingByIntent: Record<Intent, string> = {
  default:
    "focus:outline-none focus:ring-0 focus:border-primary-500 dark:focus:border-primary-400",
  primary:
    "focus:outline-none focus:ring-0 focus:border-primary-500 dark:focus:border-primary-400",
  secondary:
    "focus:outline-none focus:ring-0 focus:border-secondary-500 dark:focus:border-secondary-400",
  success:
    "focus:outline-none focus:ring-0 focus:border-success-500 dark:focus:border-success-400",
  warning:
    "focus:outline-none focus:ring-0 focus:border-warning-500 dark:focus:border-warning-400",
  info: "focus:outline-none focus:ring-0 focus:border-info-500 dark:focus:border-info-400",
  danger:
    "focus:outline-none focus:ring-0 focus:border-danger-500 dark:focus:border-danger-400",
};

const textColorByIntent: Record<Intent, string> = {
  default: "text-slate-900 dark:text-slate-100",
  primary: "text-slate-900 dark:text-slate-100",
  secondary: "text-slate-900 dark:text-slate-100",
  success: "text-slate-900 dark:text-slate-100",
  warning: "text-slate-900 dark:text-slate-100",
  info: "text-slate-900 dark:text-slate-100",
  danger: "text-slate-900 dark:text-slate-100",
};

const bgColorByVariant: Record<Variant, Record<Intent, string>> = {
  outline: {
    default: "bg-white dark:bg-slate-600/20",
    primary: "bg-white dark:bg-slate-900/80",
    secondary: "bg-white dark:bg-slate-900/80",
    success: "bg-white dark:bg-slate-900/80",
    warning: "bg-white dark:bg-slate-900/80",
    info: "bg-white dark:bg-slate-900/80",
    danger: "bg-white dark:bg-slate-900/80",
  },
  subtle: {
    default: "bg-slate-100 dark:bg-slate-800/70",
    primary: "bg-primary-50 dark:bg-primary-900/15",
    secondary: "bg-secondary-50 dark:bg-secondary-900/15",
    success: "bg-success-50 dark:bg-success-900/10",
    warning: "bg-warning-50 dark:bg-warning-900/10",
    info: "bg-info-50 dark:bg-info-900/10",
    danger: "bg-danger-50 dark:bg-danger-900/10",
  },
  solid: {
    default: "bg-white dark:bg-slate-900",
    primary: "bg-white dark:bg-slate-900",
    secondary: "bg-white dark:bg-slate-900",
    success: "bg-white dark:bg-slate-900",
    warning: "bg-white dark:bg-slate-900",
    info: "bg-white dark:bg-slate-900",
    danger: "bg-white dark:bg-slate-900",
  },
};

const errorFocusClasses =
  "border-danger-500 dark:border-danger-500 focus:border-danger-500 dark:focus:border-danger-500 focus:ring-0";

const errorPlaceholderClasses =
  "placeholder:text-danger-500/50 dark:placeholder:text-danger-400/50";

const TextArea = forwardRef<HTMLTextAreaElement, TextAreaFieldProps>(
  (
    {
      label,
      description,
      hint,
      error,
      required,
      disabled,
      intent = "default",
      variant = "outline",
      size = "md",
      radius = "md",
      resize = "vertical",
      autoGrow = false,
      className,
      textareaClassName,
      labelClassName,
      descriptionClassName,
      hintClassName,
      errorClassName,
      id: externalId,
      ...textareaProps
    },
    forwardedRef
  ) => {
    const generatedId = useId();
    const id = externalId || generatedId;
    const localRef = useRef<HTMLTextAreaElement>(null);

    const setRef = useCallback(
      (el: HTMLTextAreaElement | null) => {
        (
          localRef as React.MutableRefObject<HTMLTextAreaElement | null>
        ).current = el;
        if (typeof forwardedRef === "function") forwardedRef(el);
        else if (forwardedRef) forwardedRef.current = el;
      },
      [forwardedRef]
    );

    const adjustHeight = useCallback((el: HTMLTextAreaElement) => {
      el.style.height = "auto";
      el.style.height = `${el.scrollHeight}px`;
    }, []);

    useEffect(() => {
      if (autoGrow && localRef.current) adjustHeight(localRef.current);
    }, [autoGrow, adjustHeight, textareaProps.value]);

    const handleInput = (e: React.FormEvent<HTMLTextAreaElement>) => {
      if (autoGrow) adjustHeight(e.currentTarget);
    };
    const descriptionId = `${id}-description`;
    const errorId = `${id}-error`;
    const hintId = `${id}-hint`;

    const showError = Boolean(error);

    const describedBy =
      clsx(
        description && descriptionId,
        showError && errorId,
        !showError && hint && hintId
      ) || undefined;

    return (
      <div className={clsx("flex w-full flex-col", className)}>
        {label && (
          <LabelPrimitive.Root
            htmlFor={id}
            className={clsx(
              "mb-1.5 block text-sm font-medium",
              intent === "primary"
                ? "text-primary-800 dark:text-primary-300"
                : intent === "secondary"
                  ? "text-secondary-800 dark:text-secondary-300"
                  : "text-slate-800 dark:text-slate-200",
              disabled && "cursor-not-allowed opacity-60",
              labelClassName
            )}
          >
            <span className="align-middle">{label}</span>
            {required && (
              <span className="text-danger-600 dark:text-danger-400 ml-1 align-middle">
                *
              </span>
            )}
          </LabelPrimitive.Root>
        )}

        {description && (
          <p
            id={descriptionId}
            className={clsx(
              "mb-1 text-xs text-slate-500 dark:text-slate-400",
              descriptionClassName
            )}
          >
            {description}
          </p>
        )}

        <textarea
          ref={setRef}
          id={id}
          disabled={disabled}
          required={required}
          aria-invalid={showError || undefined}
          aria-describedby={describedBy}
          onInput={handleInput}
          className={clsx(
            // Base
            "block w-full border-[1.5px] transition-[border-color,box-shadow] duration-150",
            "outline-none",
            // Shape & Size
            radiusClasses[radius],
            sizeClasses[size],
            // Resize
            autoGrow ? "resize-none overflow-hidden" : resizeClasses[resize],
            // Background
            bgColorByVariant[variant][intent],
            // Text Color
            textColorByIntent[intent],
            // Placeholder Color
            !showError &&
              "placeholder:text-slate-400 dark:placeholder:text-slate-400",
            showError && errorPlaceholderClasses,
            // Border & Focus Ring
            !showError && borderColorByIntent[intent],
            !showError && !disabled && focusRingByIntent[intent],
            // Error State
            showError && errorFocusClasses,
            // Disabled
            disabled && "cursor-not-allowed opacity-60",
            textareaClassName
          )}
          {...textareaProps}
        />

        {hint && !showError && (
          <p
            id={hintId}
            className={clsx(
              "mt-1 text-xs text-slate-500 dark:text-slate-400",
              hintClassName
            )}
          >
            {hint}
          </p>
        )}

        {showError && (
          <p
            id={errorId}
            className={clsx(
              "text-danger-600 dark:text-danger-400 mt-1 text-xs",
              errorClassName
            )}
          >
            {error}
          </p>
        )}
      </div>
    );
  }
);

TextArea.displayName = "TextArea";

export default TextArea;
