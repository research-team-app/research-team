"use client";

import { Fragment } from "react";

import {
  BuildingOfficeIcon,
  ClockIcon,
  ChevronRightIcon,
  SparklesIcon,
  ArrowRightIcon,
} from "@heroicons/react/24/outline";
import { BookmarkIcon as BookmarkSolid } from "@heroicons/react/24/solid";
import { BookmarkIcon as BookmarkOutline } from "@heroicons/react/24/outline";
import { motion, useReducedMotion } from "framer-motion";
import { parseISO, isBefore, differenceInDays, isValid } from "date-fns";
import Button from "@/components/ui/Button";
import { getSearchTokens, highlightText } from "@/lib/searchHighlight";

export interface Grant {
  id: string;
  title: string;
  agency_name: string;
  agency_code?: string;
  number: string;
  open_date: string;
  close_date: string;
  opp_status: string;
  inserted_at: string;
  updated_at: string;
}

interface GrantSummaryCardProps {
  grant: Grant;
  isWishlisted?: boolean;
  isLoggedIn?: boolean;
  cardRef?: React.RefObject<HTMLDivElement>;
  animationDelay?: number;
  onWishlistToggle?: (grantId: string) => void;
  highlightQuery?: string;
  isAiResult?: boolean;
}

const grantMatchFields = (grant: Grant, query?: string): string[] => {
  const tokens = getSearchTokens(query);
  if (tokens.length === 0) return [];

  const fields: Array<{ key: string; value?: string | null }> = [
    { key: "id", value: String(grant.id) },
    { key: "title", value: grant.title },
    { key: "agency", value: grant.agency_name },
    { key: "reference", value: grant.number },
    { key: "department", value: grant.agency_code },
  ];

  return fields
    .filter((f) => {
      const text = (f.value ?? "").toLowerCase();
      return tokens.some((token) => text.includes(token));
    })
    .map((f) => f.key);
};

const parseValidDate = (value?: string | null): Date | null => {
  if (!value) return null;
  const parsed = parseISO(value);
  return isValid(parsed) ? parsed : null;
};

const normalizeGrantStatus = (value?: string | null): string => {
  const raw = value?.toLowerCase().trim() ?? "";
  if (raw.includes("forecast") || raw.includes("forcast")) return "forecasted";
  if (raw === "posted" || raw === "open") return "posted";
  if (raw === "closed") return "closed";
  if (raw === "archived") return "archived";
  return raw;
};

const GrantSummaryCard = ({
  grant,
  isWishlisted = false,
  isLoggedIn = false,
  cardRef,
  animationDelay = 0,
  onWishlistToggle,
  highlightQuery,
  isAiResult = false,
}: GrantSummaryCardProps) => {
  const reduceMotion = useReducedMotion();
  const matchedFields = isAiResult
    ? []
    : grantMatchFields(grant, highlightQuery);

  const calculateDaysRemaining = (closeDate: string | null): string => {
    const closeDateObj = parseValidDate(closeDate);
    if (!closeDateObj) return "No closing date";
    const today = new Date();
    if (
      isBefore(closeDateObj, today) &&
      differenceInDays(closeDateObj, today) < 0
    )
      return "Closed";
    const daysLeft = differenceInDays(closeDateObj, today);
    if (daysLeft < 0) return "Closed";
    if (daysLeft === 0) return "Closes today";
    if (daysLeft === 1) return "1 day left";
    if (daysLeft > 60) return `${Math.ceil(daysLeft / 30)} months left`;
    if (daysLeft > 14) return `${Math.ceil(daysLeft / 7)} weeks left`;
    return `${daysLeft} days left`;
  };

  const getUrgencyLevel = (
    closeDate: string | null
  ): "closed" | "critical" | "warning" | "safe" | "none" => {
    const closeDateObj = parseValidDate(closeDate);
    if (!closeDateObj) return "none";
    const today = new Date();
    if (
      isBefore(closeDateObj, today) &&
      differenceInDays(closeDateObj, today) < 0
    )
      return "closed";
    const daysLeft = differenceInDays(closeDateObj, today);
    if (daysLeft < 0) return "closed";
    if (daysLeft <= 7) return "critical";
    if (daysLeft <= 14) return "warning";
    return "safe";
  };

  const urgencyStyles: Record<string, string> = {
    closed: "text-red-500 dark:text-red-400",
    critical: "text-red-600 dark:text-red-400 animate-pulse",
    warning: "text-amber-600 dark:text-amber-400",
    safe: "text-emerald-600 dark:text-emerald-400",
    none: "text-slate-500 dark:text-slate-400",
  };

  const isRecentGrant = (insertedDate: string): boolean => {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    return new Date(insertedDate) > sevenDaysAgo;
  };

  const calculateDateProgress = (
    openDate: string,
    closeDate: string
  ): number => {
    const now = new Date();
    const start = parseValidDate(openDate);
    const end = parseValidDate(closeDate);
    if (!start || !end) return 0;
    if (now < start) return 0;
    if (now > end) return 100;
    const totalDuration = end.getTime() - start.getTime();
    const elapsed = now.getTime() - start.getTime();
    if (totalDuration <= 0) return 100;
    return Math.min(Math.round((elapsed / totalDuration) * 100), 100);
  };

  const formatDate = (dateString: string, fallback: string): string => {
    const date = parseValidDate(dateString);
    if (!date) return fallback;
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const getDisplayStatus = (): string => {
    const normalizedStatus = normalizeGrantStatus(grant.opp_status);

    // Trust the database status (kept in sync by the cron job).
    if (normalizedStatus === "forecasted") return "forecasted";
    if (normalizedStatus === "archived") return "archived";
    if (normalizedStatus === "closed") return "closed";

    // If close_date has passed and status is still posted, show as closed.
    const closeDateObj = parseValidDate(grant.close_date);
    if (closeDateObj && closeDateObj <= new Date()) return "closed";

    return "posted";
  };

  const getStatusConfig = (status: string) => {
    const s = status?.toLowerCase() || "";
    if (s.includes("forecast")) {
      return {
        style:
          "bg-indigo-50 text-indigo-700 ring-1 ring-indigo-200 dark:bg-indigo-950/50 dark:text-indigo-300 dark:ring-indigo-800/60",
        dotColor: "bg-indigo-500",
        label: "Forecasted",
      };
    }
    if (s.includes("posted") || s.includes("open")) {
      return {
        style:
          "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300 dark:ring-emerald-800/60",
        dotColor: "bg-emerald-500",
        label: "Open",
      };
    }
    if (s.includes("closed")) {
      return {
        style:
          "bg-red-50 text-red-600 ring-1 ring-red-200 dark:bg-red-950/50 dark:text-red-400 dark:ring-red-800/60",
        dotColor: "bg-red-500",
        label: "Closed",
      };
    }
    if (s === "archived") {
      return {
        style:
          "bg-slate-100 text-slate-500 ring-1 ring-slate-200 dark:bg-slate-800/50 dark:text-slate-400 dark:ring-slate-700/60",
        dotColor: "bg-slate-400",
        label: "Archived",
      };
    }
    return {
      style:
        "bg-blue-50 text-blue-600 ring-1 ring-blue-200 dark:bg-blue-950/50 dark:text-blue-400 dark:ring-blue-800/60",
      dotColor: "bg-blue-500",
      label: status,
    };
  };

  const isNew = isRecentGrant(grant.inserted_at);
  const dateProgress = calculateDateProgress(grant.open_date, grant.close_date);
  const daysRemainingText = calculateDaysRemaining(grant.close_date);
  const urgencyLevel = getUrgencyLevel(grant.close_date);
  const urgencyStyle = urgencyStyles[urgencyLevel];
  const statusConfig = getStatusConfig(getDisplayStatus());

  const progressBarColor =
    dateProgress >= 90
      ? "bg-red-500"
      : dateProgress >= 75
        ? "bg-amber-500"
        : "bg-primary-500 dark:bg-primary-400";

  return (
    <motion.div
      ref={cardRef}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true }}
      whileHover={{
        y: reduceMotion ? 0 : -4,
        transition: { duration: 0.25, ease: "easeOut" },
      }}
      className="group relative h-full"
    >
      {/*
        Card shell — clean white/dark surface with a crisp border and strong shadow on hover.
        A top accent line gives it a distinctive editorial edge.
      */}
      <div
        className={`relative flex h-full min-h-110 flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm transition-shadow duration-300 group-hover:shadow-lg group-hover:shadow-slate-200/70 dark:border-slate-700/60 dark:bg-slate-800 dark:shadow-md dark:shadow-black/30 dark:group-hover:shadow-lg dark:group-hover:shadow-black/50`}
      >
        {/* ── Header ─────────────────────────────────────────────── */}
        <div className="relative flex items-start justify-between gap-3 border-b border-slate-100 px-5 py-4 dark:border-slate-700/60">
          {/* Agency */}
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-100 dark:bg-slate-700">
              <BuildingOfficeIcon className="h-4.5 w-4.5 text-slate-500 dark:text-slate-400" />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] font-semibold tracking-widest text-slate-400 uppercase dark:text-slate-500">
                Agency
              </p>
              <p className="mt-0.5 truncate text-sm font-semibold text-slate-800 dark:text-slate-100">
                {highlightText(grant.agency_name, highlightQuery)}
              </p>
            </div>
          </div>

          {/* Status + New badge */}
          <div className="flex shrink-0 items-center gap-2">
            {isNew && (
              <span className="bg-primary-600 dark:bg-primary-500 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold tracking-wider text-white uppercase">
                <SparklesIcon className="h-2.5 w-2.5" />
                New
              </span>
            )}
            <span
              className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${statusConfig.style}`}
            >
              <span
                className={`h-1.5 w-1.5 rounded-full ${statusConfig.dotColor}`}
              />
              {statusConfig.label}
            </span>
          </div>
        </div>

        {/* ── Body ───────────────────────────────────────────────── */}
        <div className="flex flex-1 flex-col px-5 py-5 sm:px-6">
          {/* Search match chips */}
          {!!highlightQuery?.trim() && (
            <div className="mb-3 flex flex-wrap items-center gap-1.5">
              <span className="text-[10px] font-semibold tracking-wider text-slate-400 uppercase dark:text-slate-500">
                {isAiResult ? "AI matched" : "Matched"} in
              </span>
              {matchedFields.length > 0 ? (
                matchedFields.slice(0, 3).map((field) => (
                  <span
                    key={field}
                    className="rounded-md border border-amber-200 bg-amber-50 px-1.5 py-0.5 text-[10px] font-semibold text-amber-700 dark:border-amber-700/50 dark:bg-amber-900/20 dark:text-amber-300"
                  >
                    {field}
                  </span>
                ))
              ) : (
                <span className="rounded-md border border-amber-200 bg-amber-50 px-1.5 py-0.5 text-[10px] font-semibold text-amber-700 dark:border-amber-700/50 dark:bg-amber-900/20 dark:text-amber-300">
                  semantic relevance
                </span>
              )}
            </div>
          )}

          {/* Grant title */}
          <h3 className="mb-5 line-clamp-3 text-base leading-snug font-semibold tracking-tight text-slate-900 dark:text-slate-100">
            {highlightText(grant.title, highlightQuery)}
          </h3>

          {/* ── Timeline block ──────────────────────────────────── */}
          <div className="mb-5 rounded-lg border border-slate-100 bg-slate-50/80 px-4 py-3.5 dark:border-slate-700/50 dark:bg-slate-700/30">
            {/* Label + countdown */}
            <div className="mb-2.5 flex items-center justify-between">
              <span className="text-[10px] font-semibold tracking-widest text-slate-400 uppercase dark:text-slate-500">
                Timeline
              </span>
              <span
                className={`flex items-center gap-1 text-xs font-semibold ${urgencyStyle}`}
              >
                <ClockIcon className="h-3 w-3 shrink-0" />
                {daysRemainingText}
              </span>
            </div>

            {/* Progress bar */}
            <div className="mb-3 h-1.5 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
              <motion.div
                initial={{ width: 0 }}
                whileInView={{ width: `${dateProgress}%` }}
                viewport={{ once: true }}
                transition={{
                  duration: 0.9,
                  delay: animationDelay + 0.15,
                  ease: "easeOut",
                }}
                className={`h-full rounded-full ${progressBarColor}`}
              />
            </div>

            {/* Date range */}
            <div className="flex items-center justify-between text-xs">
              <div>
                <p className="text-[10px] font-medium tracking-wider text-slate-400 uppercase dark:text-slate-500">
                  Opens
                </p>
                <p className="font-semibold text-slate-700 dark:text-slate-300">
                  {formatDate(grant.open_date, "No start date")}
                </p>
              </div>
              <ArrowRightIcon className="h-3.5 w-3.5 text-slate-300 dark:text-slate-600" />
              <div className="text-right">
                <p className="text-[10px] font-medium tracking-wider text-slate-400 uppercase dark:text-slate-500">
                  Closes
                </p>
                <p className="font-semibold text-slate-700 dark:text-slate-300">
                  {formatDate(grant.close_date, "No closing date")}
                </p>
              </div>
            </div>
          </div>

          {/* ── Meta fields ─────────────────────────────────────── */}
          <div className="grid grid-cols-[3rem_1fr] gap-x-3 gap-y-2.5 border-t border-slate-100 pt-4 text-xs dark:border-slate-700/60">
            {[
              { label: "ID", value: String(grant.id) },
              { label: "Ref", value: grant.number ?? "—" },
              { label: "Dept", value: grant.agency_code || grant.agency_name },
            ].map(({ label, value }) => (
              <Fragment key={label}>
                <span className="self-baseline text-[10px] font-semibold tracking-wider text-slate-400 uppercase dark:text-slate-500">
                  {label}
                </span>
                <span
                  className="min-w-0 truncate font-medium text-slate-700 dark:text-slate-300"
                  title={value}
                >
                  {highlightText(value, highlightQuery)}
                </span>
              </Fragment>
            ))}
          </div>

          <div className="flex-1" />
        </div>

        {/* ── Footer / Actions ───────────────────────────────────── */}
        <div className="flex items-center justify-between gap-3 border-t border-slate-100 bg-slate-50 px-5 py-3 dark:border-slate-700/60 dark:bg-slate-700/30">
          {/* Wishlist */}
          <div className="min-w-0">
            {isLoggedIn && (
              <Button
                type="button"
                size="sm"
                variant="outline"
                intent={isWishlisted ? "danger" : "default"}
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onWishlistToggle?.(grant.id);
                }}
                title={isWishlisted ? "Remove from saved" : "Save grant"}
                aria-label={isWishlisted ? "Remove from saved" : "Save grant"}
                className={
                  isWishlisted
                    ? "border-red-300 bg-red-50 text-red-700 hover:bg-red-100 dark:border-red-700 dark:bg-transparent dark:text-red-100 dark:hover:bg-red-900/50"
                    : "border-slate-200 bg-white text-slate-500 hover:border-slate-300 hover:bg-slate-50 hover:text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400 dark:hover:border-slate-600 dark:hover:bg-slate-700 dark:hover:text-slate-100"
                }
                startIcon={
                  isWishlisted ? (
                    <BookmarkSolid className="h-3.5 w-3.5 shrink-0" />
                  ) : (
                    <BookmarkOutline className="h-3.5 w-3.5 shrink-0" />
                  )
                }
              >
                <span className="whitespace-nowrap">
                  {isWishlisted ? "Remove from wishlist" : "Save to wishlist"}
                </span>
              </Button>
            )}
          </div>

          {/* Primary CTA */}
          <Button
            intent="default"
            variant="outline"
            size="md"
            href={`/grant/?id=${grant.id}`}
            className="min-w-0 text-xs font-semibold"
            endIcon={
              <ChevronRightIcon className="h-3.5 w-3.5 shrink-0 transition-transform duration-150 group-hover:translate-x-0.5" />
            }
          >
            View details
          </Button>
        </div>
      </div>
    </motion.div>
  );
};

export default GrantSummaryCard;
