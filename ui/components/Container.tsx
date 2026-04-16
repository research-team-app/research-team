"use client";

import React from "react";

type Variant = "primary" | "secondary" | "hero" | "footer" | "navbar";

// PRIMARY: restrained academic tones
const BG_PRIMARY =
  "relative isolate overflow-hidden bg-gradient-to-b from-white via-slate-50/55 to-slate-100/60 dark:from-slate-950 dark:via-slate-900/45 dark:to-slate-950";

// SECONDARY: Clean, minimal with just a hint of color
const BG_SECONDARY =
  "relative isolate bg-gradient-to-b from-slate-100/85 via-white to-slate-50/80 dark:from-slate-900/70 dark:via-slate-950 dark:to-slate-950";

const BG_HERO_BASE =
  "relative isolate overflow-hidden bg-white dark:bg-slate-950";

const BG_FOOTER_BASE =
  "relative isolate overflow-hidden bg-slate-50 dark:bg-slate-950";

// NAVBAR: Glass morphism with gradient
const BG_NAVBAR_BASE =
  "relative isolate overflow-hidden bg-white/80 dark:bg-slate-950/80 backdrop-blur-xl border-b border-primary-100/50 dark:border-primary-900/50";

type Props = React.HTMLAttributes<HTMLDivElement> & {
  variant?: Variant;
};

export function Container({
  variant = "primary",
  className,
  children,
  ...rest
}: Props) {
  if (variant === "hero") {
    return (
      <section
        className={[BG_HERO_BASE, "py-6 md:py-8", className]
          .filter(Boolean)
          .join(" ")}
        {...rest}
      >
        {/* Subtle dot grid — academic texture, no color */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-[0.035] dark:opacity-[0.05]"
          style={{
            backgroundImage:
              "radial-gradient(circle, currentColor 1px, transparent 1px)",
            backgroundSize: "24px 24px",
          }}
        />

        {/* Bottom fade — smooth transition to next section */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-linear-to-b from-transparent to-slate-50/60 dark:to-slate-950/60"
        />

        {/* Content */}
        <div className="relative z-10">{children}</div>
      </section>
    );
  }

  if (variant === "footer") {
    return (
      <footer
        className={[BG_FOOTER_BASE, className].filter(Boolean).join(" ")}
        {...rest}
      >
        {/* Top border — clean separator */}
        <div className="absolute inset-x-0 top-0 h-px bg-slate-200 dark:bg-slate-800" />

        {/* Subtle dot grid — matches PageHeader academic texture */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-[0.025] dark:opacity-[0.04]"
          style={{
            backgroundImage:
              "radial-gradient(circle, currentColor 1px, transparent 1px)",
            backgroundSize: "24px 24px",
          }}
        />

        {/* Content */}
        <div className="relative z-10">{children}</div>
      </footer>
    );
  }

  if (variant === "navbar") {
    return (
      <nav
        className={[BG_NAVBAR_BASE, className].filter(Boolean).join(" ")}
        {...rest}
      >
        {/* Content */}
        <div className="relative z-10">{children}</div>
      </nav>
    );
  }

  if (variant === "primary") {
    return (
      <div
        className={[BG_PRIMARY, className].filter(Boolean).join(" ")}
        {...rest}
      >
        {/* Subtle section separators */}
        <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-linear-to-r from-transparent via-slate-300/80 to-transparent dark:via-slate-700/45" />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-px bg-linear-to-r from-transparent via-slate-200/80 to-transparent dark:via-slate-700/40" />

        {/* Subtle dot pattern */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-[0.04] dark:opacity-[0.02]"
          style={{
            backgroundImage:
              "radial-gradient(circle, oklch(55% 0.01 257 / 0.45) 1px, transparent 1px)",
            backgroundSize: "36px 36px",
          }}
        />

        {/* Soft vertical wash */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-[0.05] dark:opacity-[0.03]"
          style={{
            backgroundImage: `
              linear-gradient(
                to bottom,
                oklch(97% 0.005 257 / 0.9) 0%,
                transparent 28%,
                transparent 72%,
                oklch(97% 0.005 257 / 0.9) 100%
              )
            `,
          }}
        />

        {/* Soft corner gradients */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-[0.15] dark:opacity-[0.05]"
          style={{
            backgroundImage: `
              radial-gradient(circle at 0% 0%, oklch(92% 0.008 257 / 0.8) 0%, transparent 52%),
              radial-gradient(circle at 100% 100%, oklch(90% 0.007 257 / 0.7) 0%, transparent 52%)
            `,
          }}
        />

        <div className="relative z-10">{children}</div>
      </div>
    );
  }

  // Secondary variant - clean and minimal
  return (
    <div
      className={[BG_SECONDARY, className].filter(Boolean).join(" ")}
      {...rest}
    >
      {/* Minimal separators for cleaner section boundaries */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-linear-to-r from-transparent via-slate-300/70 to-transparent dark:via-slate-700/40" />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-px bg-linear-to-r from-transparent via-slate-200/70 to-transparent dark:via-slate-800/40" />

      {/* Very subtle texture */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.015] dark:opacity-[0.01]"
        style={{
          backgroundImage:
            "radial-gradient(circle, oklch(55% 0.01 257 / 0.45) 0.5px, transparent 0.5px)",
          backgroundSize: "28px 28px",
        }}
      />

      <div className="relative z-10">{children}</div>
    </div>
  );
}
