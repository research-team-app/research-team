"use client";

import React from "react";

type Variant = "primary" | "secondary" | "hero" | "footer" | "navbar";

// PRIMARY: restrained academic tones
const BG_PRIMARY =
  "relative isolate overflow-hidden bg-gradient-to-b from-white via-primary-50/35 to-slate-50/70 dark:from-slate-950 dark:via-slate-900/70 dark:to-slate-950";

// SECONDARY: Clean, minimal with just a hint of color
const BG_SECONDARY =
  "relative isolate bg-gradient-to-b from-slate-100/70 via-white to-slate-50/60 dark:from-slate-900/90 dark:via-slate-950 dark:to-slate-950";

// HERO: clean academic base gradient
const BG_HERO_BASE =
  "relative isolate overflow-hidden bg-gradient-to-br from-slate-50 via-white to-slate-100/70 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950";

// FOOTER: Creative base gradient (inverted)
const BG_FOOTER_BASE =
  "relative isolate overflow-hidden bg-gradient-to-t from-slate-100/80 via-slate-50/70 to-white dark:from-slate-950 dark:via-slate-900 dark:to-slate-950";

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
        {/* Layer 1: Animated gradient orbs */}
        <div
          aria-hidden
          className="pointer-events-none absolute -top-48 -right-48 h-150 w-150 animate-pulse rounded-full opacity-30 blur-3xl dark:opacity-15"
          style={{
            background:
              "radial-gradient(circle, oklch(65% 0.25 200), transparent 65%)",
            animationDuration: "8s",
          }}
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -bottom-48 -left-48 h-150 w-150 animate-pulse rounded-full opacity-25 blur-3xl dark:opacity-12"
          style={{
            background:
              "radial-gradient(circle, oklch(72% 0.12 230), transparent 65%)",
            animationDuration: "10s",
            animationDelay: "2s",
          }}
        />
        <div
          aria-hidden
          className="pointer-events-none absolute top-1/3 right-1/4 h-96 w-96 animate-pulse rounded-full opacity-20 blur-3xl dark:opacity-10"
          style={{
            background:
              "radial-gradient(circle, oklch(62% 0.16 220), oklch(58% 0.12 245), transparent 70%)",
            animationDuration: "12s",
            animationDelay: "4s",
          }}
        />

        {/* Layer 2: Flowing wave pattern */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-[0.15] dark:opacity-[0.08]"
          style={{
            backgroundImage: `
              repeating-linear-gradient(
                -45deg,
                transparent,
                transparent 40px,
                oklch(65% 0.25 200 / 0.15) 40px,
                oklch(65% 0.25 200 / 0.15) 42px,
                transparent 42px,
                transparent 80px,
                oklch(72% 0.12 230 / 0.12) 80px,
                oklch(72% 0.12 230 / 0.12) 82px
              )
            `,
          }}
        />

        {/* Layer 3: Hexagon/Circle dot grid */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-20 dark:opacity-10"
          style={{
            backgroundImage: `
              radial-gradient(circle, oklch(55% 0.2 220 / 0.5) 1.5px, transparent 1.5px),
              radial-gradient(circle, oklch(62% 0.12 235 / 0.45) 1px, transparent 1px)
            `,
            backgroundSize: "50px 50px, 30px 30px",
            backgroundPosition: "0 0, 25px 25px",
          }}
        />

        {/* Layer 4: Large grid system */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-[0.06] dark:opacity-[0.04]"
          style={{
            backgroundImage: `
              linear-gradient(oklch(55% 0.2 220 / 0.4) 1.5px, transparent 1.5px),
              linear-gradient(90deg, oklch(62% 0.12 235 / 0.35) 1.5px, transparent 1.5px)
            `,
            backgroundSize: "100px 100px",
          }}
        />

        {/* Layer 5: Radial mesh gradient overlay */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-40 dark:opacity-20"
          style={{
            backgroundImage: `
              radial-gradient(circle at 20% 20%, oklch(65% 0.2 220 / 0.16) 0%, transparent 40%),
              radial-gradient(circle at 80% 20%, oklch(72% 0.12 230 / 0.12) 0%, transparent 40%),
              radial-gradient(circle at 40% 80%, oklch(62% 0.12 235 / 0.14) 0%, transparent 40%),
              radial-gradient(circle at 60% 60%, oklch(65% 0.2 220 / 0.1) 0%, transparent 50%)
            `,
          }}
        />

        {/* Layer 6: Geometric diamond pattern */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-[0.08] dark:opacity-[0.05]"
          style={{
            backgroundImage: `
              linear-gradient(45deg, transparent 48%, oklch(65% 0.2 220 / 0.35) 49%, oklch(65% 0.2 220 / 0.35) 51%, transparent 52%),
              linear-gradient(-45deg, transparent 48%, oklch(62% 0.12 235 / 0.3) 49%, oklch(62% 0.12 235 / 0.3) 51%, transparent 52%)
            `,
            backgroundSize: "60px 60px",
          }}
        />

        {/* Layer 7: Spotlight effect from top */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 top-0 h-96 opacity-30 dark:opacity-15"
          style={{
            background: `
              radial-gradient(ellipse at top, 
                oklch(65% 0.2 220 / 0.25) 0%, 
                oklch(62% 0.12 235 / 0.12) 30%, 
                transparent 70%
              )
            `,
          }}
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
        {/* Top decorative border */}
        <div className="via-primary-400 dark:via-primary-600 absolute inset-x-0 top-0 h-1 bg-linear-to-r from-transparent to-transparent" />
        <div className="from-primary-400/50 via-secondary-400 to-primary-400/50 dark:from-primary-600/50 dark:via-secondary-600 dark:to-primary-600/50 absolute inset-x-0 top-0 h-px bg-linear-to-r blur-sm" />

        {/* Large gradient blobs from top */}
        <div
          aria-hidden
          className="pointer-events-none absolute -top-32 left-1/4 h-80 w-80 rounded-full opacity-25 blur-3xl dark:opacity-12"
          style={{
            background:
              "radial-gradient(circle, oklch(65% 0.25 200), transparent 60%)",
          }}
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -top-40 right-1/3 h-96 w-96 rounded-full opacity-20 blur-3xl dark:opacity-10"
          style={{
            background:
              "radial-gradient(circle, oklch(66% 0.28 290), transparent 60%)",
          }}
        />

        {/* Radial mesh from top */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-30 dark:opacity-15"
          style={{
            backgroundImage: `
              radial-gradient(circle at 15% 0%, oklch(65% 0.25 200 / 0.25) 0%, transparent 35%),
              radial-gradient(circle at 85% 0%, oklch(66% 0.28 290 / 0.2) 0%, transparent 35%),
              radial-gradient(circle at 50% 0%, oklch(55% 0.3 200 / 0.15) 0%, transparent 50%)
            `,
          }}
        />

        {/* Flowing wave pattern (inverted) */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-[0.1] dark:opacity-[0.06]"
          style={{
            backgroundImage: `
              repeating-linear-gradient(
                45deg,
                transparent,
                transparent 40px,
                oklch(65% 0.25 200 / 0.2) 40px,
                oklch(65% 0.25 200 / 0.2) 42px,
                transparent 42px,
                transparent 80px,
                oklch(66% 0.28 290 / 0.2) 80px,
                oklch(66% 0.28 290 / 0.2) 82px
              )
            `,
          }}
        />

        {/* Dot grid with top fade */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-[0.15] dark:opacity-[0.08]"
          style={{
            backgroundImage: `
              radial-gradient(circle, oklch(55% 0.3 200 / 0.6) 1px, transparent 1px),
              radial-gradient(circle, oklch(56% 0.33 290 / 0.5) 0.8px, transparent 0.8px)
            `,
            backgroundSize: "40px 40px, 25px 25px",
            backgroundPosition: "0 0, 20px 20px",
            maskImage:
              "linear-gradient(to bottom, black 0%, black 60%, transparent 100%)",
            WebkitMaskImage:
              "linear-gradient(to bottom, black 0%, black 60%, transparent 100%)",
          }}
        />

        {/* Diamond pattern at top */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 top-0 h-48 opacity-[0.08] dark:opacity-[0.05]"
          style={{
            backgroundImage: `
              linear-gradient(45deg, transparent 48%, oklch(65% 0.25 200 / 0.5) 49%, oklch(65% 0.25 200 / 0.5) 51%, transparent 52%),
              linear-gradient(-45deg, transparent 48%, oklch(66% 0.28 290 / 0.5) 49%, oklch(66% 0.28 290 / 0.5) 51%, transparent 52%)
            `,
            backgroundSize: "50px 50px",
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
        {/* Subtle horizontal gradient wash */}
        <div
          aria-hidden
          className="from-primary-50/20 dark:from-primary-950/10 pointer-events-none absolute inset-0 bg-linear-to-r via-transparent to-slate-100/20 dark:via-transparent dark:to-slate-900/10"
        />

        {/* Delicate dot pattern */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-[0.05] dark:opacity-[0.03]"
          style={{
            backgroundImage:
              "radial-gradient(circle, oklch(55% 0.3 200 / 0.5) 0.5px, transparent 0.5px)",
            backgroundSize: "20px 20px",
          }}
        />

        {/* Edge glow accents */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-[0.08] dark:opacity-[0.05]"
          style={{
            backgroundImage: `
              radial-gradient(ellipse at 0% 50%, oklch(65% 0.25 200 / 0.2) 0%, transparent 25%),
              radial-gradient(ellipse at 100% 50%, oklch(62% 0.12 235 / 0.12) 0%, transparent 25%)
            `,
          }}
        />

        {/* Bottom accent gradient line */}
        <div className="absolute inset-x-0 bottom-0 h-px">
          <div className="via-primary-300/60 dark:via-primary-700/50 absolute inset-0 bg-linear-to-r from-transparent to-transparent" />
          <div className="from-primary-200/40 to-primary-200/40 dark:from-primary-800/30 dark:to-primary-800/30 absolute inset-0 bg-linear-to-r via-slate-300/50 blur-sm dark:via-slate-700/40" />
        </div>

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
        <div className="via-primary-200/80 dark:via-primary-800/40 pointer-events-none absolute inset-x-0 top-0 h-px bg-linear-to-r from-transparent to-transparent" />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-px bg-linear-to-r from-transparent via-slate-200/80 to-transparent dark:via-slate-700/40" />

        {/* Subtle dot pattern */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-[0.04] dark:opacity-[0.03]"
          style={{
            backgroundImage:
              "radial-gradient(circle, oklch(55% 0.04 240 / 0.5) 1px, transparent 1px)",
            backgroundSize: "36px 36px",
          }}
        />

        {/* Soft vertical wash */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-[0.05] dark:opacity-[0.04]"
          style={{
            backgroundImage: `
              linear-gradient(
                to bottom,
                oklch(97% 0.01 240 / 0.9) 0%,
                transparent 28%,
                transparent 72%,
                oklch(97% 0.01 240 / 0.9) 100%
              )
            `,
          }}
        />

        {/* Soft corner gradients */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-[0.15] dark:opacity-[0.08]"
          style={{
            backgroundImage: `
              radial-gradient(circle at 0% 0%, oklch(92% 0.015 245 / 0.8) 0%, transparent 52%),
              radial-gradient(circle at 100% 100%, oklch(90% 0.012 245 / 0.7) 0%, transparent 52%)
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
        className="pointer-events-none absolute inset-0 opacity-[0.015] dark:opacity-[0.012]"
        style={{
          backgroundImage:
            "radial-gradient(circle, oklch(55% 0.02 240 / 0.45) 0.5px, transparent 0.5px)",
          backgroundSize: "28px 28px",
        }}
      />

      <div className="relative z-10">{children}</div>
    </div>
  );
}
