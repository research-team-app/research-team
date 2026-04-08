"use client";

import { ReactNode } from "react";
import { motion, useReducedMotion } from "framer-motion";
import {
  DocumentMagnifyingGlassIcon,
  UsersIcon,
  ChatBubbleLeftRightIcon,
  ArrowTrendingUpIcon,
  ChevronRightIcon,
} from "@heroicons/react/24/outline";
import { CheckBadgeIcon } from "@heroicons/react/24/solid";

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
  variant: "grants" | "collaborators" | "feed";
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
    accentFrom: "from-primary-600",
    accentTo: "to-primary-500",
    accentFromDark: "dark:from-primary-500",
    accentToDark: "dark:to-primary-400",
    iconBg: "bg-slate-200/70 dark:bg-slate-700/60",
    iconColor: "text-slate-700 dark:text-slate-200",
  },
  collaborators: {
    icon: UsersIcon,
    defaultTitle: "Collaborators",
    defaultSubtitle:
      "Connect with researchers and institutions for your next project",
    accentFrom: "from-primary-600",
    accentTo: "to-primary-500",
    accentFromDark: "dark:from-primary-500",
    accentToDark: "dark:to-primary-400",
    iconBg: "bg-slate-200/70 dark:bg-slate-700/60",
    iconColor: "text-slate-700 dark:text-slate-200",
  },
  feed: {
    icon: ChatBubbleLeftRightIcon,
    defaultTitle: "Community Feed",
    defaultSubtitle: "Discuss ideas, ask questions, and engage with peers",
    accentFrom: "from-primary-600",
    accentTo: "to-primary-500",
    accentFromDark: "dark:from-primary-500",
    accentToDark: "dark:to-primary-400",
    iconBg: "bg-slate-200/70 dark:bg-slate-700/60",
    iconColor: "text-slate-700 dark:text-slate-200",
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
  const reduceMotion = useReducedMotion();
  const config = variantConfig[variant];
  const Icon = config.icon;

  const displayTitle = title || config.defaultTitle;
  const displaySubtitle = subtitle || config.defaultSubtitle;

  return (
    <div className="relative mb-5">
      {/* Main Header Container */}
      <div className="border-border bg-card overflow-hidden rounded-2xl border shadow-sm dark:relative dark:border-slate-700 dark:bg-slate-900/80">
        {/* Subtle Background Pattern */}
        <div className="absolute inset-0 opacity-[0.01] dark:opacity-[0.01]">
          <svg className="h-full w-full" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <pattern
                id="header-grid"
                width="32"
                height="32"
                patternUnits="userSpaceOnUse"
              >
                <path
                  d="M0 32V0h32"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1"
                />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#header-grid)" />
          </svg>
        </div>
        {/* Content */}
        <div className="relative px-6 py-4 sm:px-8 sm:py-5">
          {/* Breadcrumbs */}
          {breadcrumbs && breadcrumbs.length > 0 && (
            <nav className="mb-4">
              <ol className="flex items-center gap-2 text-sm">
                {breadcrumbs.map((crumb, index) => (
                  <li key={index} className="flex items-center gap-2">
                    {index > 0 && (
                      <ChevronRightIcon className="h-3.5 w-3.5 text-slate-400 dark:text-slate-500" />
                    )}
                    {crumb.href ? (
                      <a
                        href={crumb.href}
                        className="text-slate-500 transition-colors hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100"
                      >
                        {crumb.label}
                      </a>
                    ) : (
                      <span className="font-medium text-slate-900 dark:text-slate-100">
                        {crumb.label}
                      </span>
                    )}
                  </li>
                ))}
              </ol>
            </nav>
          )}

          {/* Main Header Row */}
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            {/* Left Section - Title & Info */}
            <div className="flex items-center gap-3">
              {/* Icon Container */}
              <motion.div
                initial={reduceMotion ? {} : { scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.3 }}
                className={`hidden rounded-lg p-2 sm:block ${config.iconBg}`}
              >
                <Icon className={`h-5 w-5 ${config.iconColor}`} />
              </motion.div>

              {/* Title Block */}
              <div>
                <motion.h1
                  initial={reduceMotion ? {} : { y: 10, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ duration: 0.3, delay: 0.1 }}
                  className="text-xl font-bold tracking-tight text-slate-900 sm:text-2xl dark:text-slate-50"
                >
                  {displayTitle}
                </motion.h1>

                <motion.p
                  initial={reduceMotion ? {} : { y: 10, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ duration: 0.3, delay: 0.15 }}
                  className="mt-0.5 text-sm text-slate-500 dark:text-slate-400"
                >
                  {displaySubtitle}
                </motion.p>

                {/* User Welcome */}
                {user && (
                  <motion.div
                    initial={reduceMotion ? {} : { y: 10, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ duration: 0.3, delay: 0.2 }}
                    className="flex items-center gap-2 pt-2"
                  >
                    <CheckBadgeIcon className="h-4 w-4 text-green-500" />
                    <span className="text-sm text-slate-600 dark:text-slate-400">
                      Welcome back
                      {user.name && (
                        <span className="font-medium text-slate-900 dark:text-slate-100">
                          , {user.name}
                        </span>
                      )}
                    </span>
                  </motion.div>
                )}
              </div>
            </div>

            {/* Right Section - Actions */}
            {actions && (
              <motion.div
                initial={reduceMotion ? {} : { x: 20, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ duration: 0.3, delay: 0.2 }}
                className="flex shrink-0 items-center gap-3"
              >
                {actions}
              </motion.div>
            )}
          </div>

          {/* Stats Row */}
          {stats && stats.length > 0 && (
            <motion.div
              initial={reduceMotion ? {} : { y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ duration: 0.4, delay: 0.25 }}
              className="border-border mt-6 grid grid-cols-2 gap-4 border-t pt-6 sm:grid-cols-4"
            >
              {stats.map((stat, index) => (
                <div key={index} className="space-y-1">
                  <p className="text-xs font-medium tracking-wider text-slate-500 uppercase dark:text-slate-400">
                    {stat.label}
                  </p>
                  <div className="flex items-baseline gap-2">
                    <p className="text-2xl font-bold text-slate-900 dark:text-slate-50">
                      {typeof stat.value === "number"
                        ? stat.value.toLocaleString()
                        : stat.value}
                    </p>
                    {stat.trend && (
                      <span
                        className={`flex items-center text-xs font-medium ${
                          stat.trendUp
                            ? "text-green-600 dark:text-green-400"
                            : "text-red-600 dark:text-red-400"
                        }`}
                      >
                        <ArrowTrendingUpIcon
                          className={`h-3 w-3 ${!stat.trendUp && "rotate-180"}`}
                        />
                        {stat.trend}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PageHeader;
