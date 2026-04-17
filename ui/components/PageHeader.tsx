"use client";

import { ReactNode } from "react";
import {
  DocumentMagnifyingGlassIcon,
  UsersIcon,
  ChatBubbleLeftRightIcon,
  UserGroupIcon,
  ArrowTrendingUpIcon,
  ChevronRightIcon,
} from "@heroicons/react/24/outline";
import { CheckBadgeIcon } from "@heroicons/react/24/solid";
import { cn } from "@/lib/utils";

interface Stat {
  label: string;
  value: string | number;
  trend?: string;
  trendUp?: boolean;
}

interface Breadcrumb {
  label: string;
  href?: string;
}

interface PageHeaderProps {
  variant: "grants" | "collaborators" | "feed" | "teams";
  title?: string;
  subtitle?: string;
  user?: { name?: string; email?: string } | null;
  stats?: Stat[];
  breadcrumbs?: Breadcrumb[];
  actions?: ReactNode;
}

const variantConfig = {
  grants: {
    icon: DocumentMagnifyingGlassIcon,
    defaultTitle: "Grants Explorer",
    defaultSubtitle:
      "Discover and track funding opportunities across all federal agencies",
  },
  collaborators: {
    icon: UsersIcon,
    defaultTitle: "Collaborators",
    defaultSubtitle:
      "Find researchers, institutions, and expertise for your next project",
  },
  feed: {
    icon: ChatBubbleLeftRightIcon,
    defaultTitle: "Community Feed",
    defaultSubtitle: "Discuss ideas, ask questions, and engage with peers",
  },
  teams: {
    icon: UserGroupIcon,
    defaultTitle: "Research Teams",
    defaultSubtitle:
      "Search public teams, request access, and collaborate in real time.",
  },
};

const PageHeader = ({
  variant,
  title,
  subtitle,
  user,
  stats,
  breadcrumbs,
  actions,
}: PageHeaderProps) => {
  const config = variantConfig[variant] ?? variantConfig.collaborators;
  const Icon = config.icon;
  const displayTitle = title || config.defaultTitle;
  const displaySubtitle = subtitle || config.defaultSubtitle;
  const showCollaboratorMeta =
    variant === "collaborators" && !title && !subtitle;

  return (
    <div className="relative mb-5">
      {/* Card */}
      <div className="overflow-hidden rounded-xl border border-slate-200/90 bg-white shadow-sm dark:border-slate-700/60 dark:bg-slate-800/75">
        {/* Accent bar — soft slate, not heavy navy */}
        <div className="h-0.5 bg-linear-to-r from-slate-400/80 via-slate-300/60 to-slate-200/40 dark:from-slate-500 dark:via-slate-600 dark:to-slate-700/90" />

        {/* Subtle dot grid  */}
        <div
          className="pointer-events-none absolute inset-0 top-1 opacity-[0.06] dark:opacity-[0.06]"
          style={{
            backgroundImage:
              "radial-gradient(circle, currentColor 1px, transparent 1px)",
            backgroundSize: "20px 20px",
          }}
        />

        <div className="relative px-6 py-5 sm:px-8 sm:py-6">
          {/* Breadcrumbs */}
          {breadcrumbs && breadcrumbs.length > 0 && (
            <nav className="mb-4">
              <ol className="flex items-center gap-1.5 text-xs">
                {breadcrumbs.map((crumb, index) => (
                  <li key={index} className="flex items-center gap-1.5">
                    {index > 0 && (
                      <ChevronRightIcon className="h-3 w-3 text-slate-400 dark:text-slate-500" />
                    )}
                    {crumb.href ? (
                      <a
                        href={crumb.href}
                        className="text-slate-400 transition-colors hover:text-slate-700 dark:text-slate-500 dark:hover:text-slate-300"
                      >
                        {crumb.label}
                      </a>
                    ) : (
                      <span className="font-medium text-slate-600 dark:text-slate-300">
                        {crumb.label}
                      </span>
                    )}
                  </li>
                ))}
              </ol>
            </nav>
          )}

          {/* Main row */}
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            {/* Left — icon + text */}
            <div className="flex items-center gap-4">
              {/* Icon — slate in light, slate in dark */}
              <div className="hidden h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-slate-700 shadow-sm ring-1 ring-slate-400/30 sm:flex dark:bg-slate-200 dark:ring-slate-500/40">
                <Icon className="h-5 w-5 text-slate-100 dark:text-slate-700" />
              </div>

              <div>
                <h1 className="text-xl font-bold tracking-tight text-slate-900 sm:text-2xl dark:text-slate-50">
                  {displayTitle}
                </h1>
                <p className="mt-0.5 text-sm leading-relaxed text-slate-500 dark:text-slate-400">
                  {displaySubtitle}
                </p>

                {showCollaboratorMeta && (
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    {[
                      "Research directory",
                      "Institution profiles",
                      "AI matching",
                    ].map((item) => (
                      <span
                        key={item}
                        className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-medium text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
                      >
                        {item}
                      </span>
                    ))}
                  </div>
                )}

                {user && (
                  <div className="mt-2.5 flex items-center gap-1.5">
                    <CheckBadgeIcon className="h-4 w-4 text-emerald-500 dark:text-emerald-400" />
                    <span className="text-sm text-slate-500 dark:text-slate-400">
                      Welcome back
                      {user.name && (
                        <span className="font-semibold text-slate-800 dark:text-slate-200">
                          {" "}
                          {user.name}
                        </span>
                      )}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Right — actions */}
            {actions && (
              <div className="flex shrink-0 items-center gap-3">{actions}</div>
            )}
          </div>

          {/* Stats */}
          {stats && stats.length > 0 && (
            <div className="mt-5 grid grid-cols-2 gap-x-6 gap-y-4 border-t border-slate-100 pt-5 sm:grid-cols-4 dark:border-slate-700">
              {stats.map((stat, index) => (
                <div key={index}>
                  <p className="text-[11px] font-semibold tracking-widest text-slate-400 uppercase dark:text-slate-500">
                    {stat.label}
                  </p>
                  <div className="mt-1 flex items-baseline gap-2">
                    <p className="text-2xl font-bold text-slate-900 dark:text-slate-50">
                      {typeof stat.value === "number"
                        ? stat.value.toLocaleString()
                        : stat.value}
                    </p>
                    {stat.trend && (
                      <span
                        className={cn(
                          "flex items-center gap-0.5 text-xs font-medium",
                          stat.trendUp
                            ? "text-emerald-600 dark:text-emerald-400"
                            : "text-red-500 dark:text-red-400"
                        )}
                      >
                        <ArrowTrendingUpIcon
                          className={cn(
                            "h-3 w-3",
                            !stat.trendUp && "rotate-180"
                          )}
                        />
                        {stat.trend}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PageHeader;
