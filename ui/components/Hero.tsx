"use client";

import {
  HiOutlineAcademicCap,
  HiOutlineCalendar,
  HiOutlineChartBar,
  HiOutlineHeart,
  HiOutlineChip,
  HiOutlineGlobeAlt,
  HiArrowRight,
  HiOutlineUserGroup,
  HiOutlineDocumentSearch,
  HiOutlineSparkles,
  HiOutlineChatAlt2,
} from "react-icons/hi";
import { motion, useReducedMotion } from "framer-motion";
import { useRouter } from "next/navigation";
import Button from "@/components/ui/Button";
import { useGrantCronStore } from "@/store/useGrantStore";
import { FaFileInvoiceDollar } from "react-icons/fa";
import { HiMiniArrowRightStartOnRectangle } from "react-icons/hi2";

const formatNumber = (num: number): string => {
  if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
  if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
  return num.toString();
};

const StatsSkeleton = () => (
  <div className="grid animate-pulse grid-cols-1 gap-3 sm:grid-cols-3">
    {[1, 2, 3].map((i) => (
      <div key={i} className="h-24 rounded-xl bg-slate-100 dark:bg-slate-800" />
    ))}
  </div>
);

const FEATURES = [
  {
    icon: HiOutlineDocumentSearch,
    label: "Grant Discovery",
    desc: "Find relevant funding",
  },
  {
    icon: HiOutlineUserGroup,
    label: "Team Formation",
    desc: "Build your research team",
  },
  {
    icon: HiOutlineChatAlt2,
    label: "Research Feed",
    desc: "Share and follow work",
  },
  {
    icon: HiOutlineSparkles,
    label: "AI Matching",
    desc: "Smart grant recommendations",
  },
];

function HeroBadge({
  label,
  value,
  showDot = true,
  dotColorClass = "bg-primary-500 dark:bg-primary-400",
}: {
  label?: string;
  value: React.ReactNode;
  showDot?: boolean;
  dotColorClass?: string;
}) {
  return (
    <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 transition-colors hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800/50 dark:hover:bg-slate-800">
      {showDot && (
        <span className="relative flex h-2 w-2 shrink-0" aria-hidden="true">
          <span
            className={`absolute inline-flex h-full w-full animate-ping rounded-full opacity-75 ${dotColorClass}`}
          />
          <span
            className={`relative inline-flex h-2 w-2 rounded-full ${dotColorClass}`}
          />
        </span>
      )}

      <span className="text-[11px] font-medium tracking-wide text-slate-600 dark:text-slate-300">
        {label && (
          <span className="font-semibold text-slate-700 dark:text-slate-200">
            {label}{" "}
          </span>
        )}
        {value}
      </span>
    </div>
  );
}

const Hero = () => {
  const router = useRouter();
  const reduceMotion = useReducedMotion();
  const { data: grantStats, isLoading: isLoadingStats } = useGrantCronStore();

  return (
    <div className="relative overflow-hidden">
      <div className="relative z-10 container mx-auto px-4 py-10 sm:px-6 sm:py-14 lg:px-8 lg:py-16">
        <div className="grid grid-cols-1 items-center gap-12 lg:grid-cols-2 lg:gap-14">
          {/* LEFT COLUMN */}
          <motion.div
            initial={{ opacity: 0, y: reduceMotion ? 0 : 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.65 }}
            className="order-1 flex flex-col items-center text-center lg:items-start lg:text-left"
          >
            {/* Eyebrow */}
            <div className="mb-6 flex items-center gap-3">
              <div className="h-px w-4 bg-slate-500 dark:bg-slate-600" />
              <span className="text-[11px] font-semibold tracking-[0.18em] text-slate-400 uppercase dark:text-slate-500">
                Research Collaboration Platform
              </span>
            </div>

            {/* Heading */}
            <h1 className="mb-4 text-4xl leading-[1.1] font-extrabold tracking-tight text-slate-900 sm:text-5xl dark:text-slate-100">
              Discover Grants,
              <br />
              <span className="text-primary-700 dark:text-primary-400">
                Build Teams.
              </span>
            </h1>

            {/* Subtitle */}
            <p className="mb-8 max-w-md text-base leading-relaxed text-slate-500 sm:text-[1.05rem] dark:text-slate-400">
              Find relevant grants, connect with qualified collaborators, and
              manage research opportunities — all in one dedicated academic hub.
            </p>

            {/* CTAs */}
            <div className="flex flex-col gap-3 sm:flex-row">
              <Button
                startIcon={
                  <HiMiniArrowRightStartOnRectangle className="size-5" />
                }
                variant="solid"
                intent="primary"
                size="lg"
                onClick={() => router.push("/login")}
              >
                <span className="font-semibold">Get Started</span>
              </Button>
              <Button
                variant="solid"
                startIcon={<FaFileInvoiceDollar className="size-4" />}
                onClick={() => router.push("/grants")}
                size="lg"
              >
                <span className="font-semibold">Browse Grants</span>
              </Button>
            </div>

            {/* Stat cards — frosted glass style */}
            <div className="mt-9 w-full">
              {isLoadingStats ? (
                <StatsSkeleton />
              ) : (
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                  {[
                    {
                      label: "Added This Week",
                      value: grantStats?.recent7Days || 0,
                      icon: HiOutlineCalendar,
                      sub: "Recently posted",
                      num: "text-slate-900 dark:text-slate-100",
                      iconCls: "",
                      subCls: "text-slate-500 dark:text-slate-300",
                      labelCls: "text-slate-700 dark:text-slate-200",
                    },
                    {
                      label: "Forecasted",
                      value: grantStats?.forecasted || 0,
                      icon: HiOutlineCalendar,
                      sub: "Expected soon",
                      num: "text-slate-900 dark:text-slate-100",
                      iconCls: "",
                      subCls: "text-slate-500 dark:text-slate-300",
                      labelCls: "text-slate-700 dark:text-slate-200",
                    },
                    {
                      label: "Total Grants",
                      value: grantStats?.total || 0,
                      icon: HiOutlineAcademicCap,
                      sub: "Across all statuses",
                      num: "text-slate-900 dark:text-slate-100",
                      iconCls: "",
                      subCls: "text-slate-500 dark:text-slate-300",
                      labelCls: "text-slate-700 dark:text-slate-200",
                    },
                  ].map((stat, idx) => {
                    const Icon = stat.icon;
                    return (
                      <motion.div
                        key={idx}
                        whileHover={{ y: 0 }}
                        className="relative flex flex-col gap-2 overflow-hidden rounded-2xl border border-white/60 bg-white/60 p-3 shadow-[0_10px_24px_rgba(15,23,42,0.10)] backdrop-blur-xl transition-all duration-300 sm:gap-1.5 sm:p-3.5 dark:border-white/10 dark:bg-slate-800 dark:shadow-[0_12px_28px_rgba(2,6,23,0.5)]"
                      >
                        <div className="absolute inset-x-0 top-0 h-px bg-linear-to-r from-transparent via-white/85 to-transparent dark:via-white/20" />
                        <div className="flex items-center gap-2">
                          <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-white/70 bg-white/70 backdrop-blur-sm dark:border-white/10 dark:bg-slate-800/70">
                            <Icon
                              className={`h-3.5 w-3.5 shrink-0 sm:h-3.5 sm:w-3.5 ${stat.iconCls}`}
                            />
                          </span>
                          <span
                            className={`text-[11px] leading-tight font-semibold sm:text-[10px] sm:tracking-wide ${stat.labelCls}`}
                          >
                            {stat.label}
                          </span>
                        </div>
                        <p
                          className={`text-2xl leading-none font-black tabular-nums sm:text-2xl ${stat.num}`}
                        >
                          {formatNumber(stat.value)}
                        </p>
                        <p className={`text-[11px] sm:text-xs ${stat.subCls}`}>
                          {stat.sub}
                        </p>
                      </motion.div>
                    );
                  })}
                </div>
              )}
            </div>
          </motion.div>

          {/* RIGHT COLUMN — Dashboard Panel */}
          <motion.div
            initial={{ opacity: 0, y: reduceMotion ? 0 : 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{
              duration: 0.65,
              delay: 0.12,
              ease: [0.22, 1, 0.36, 1],
            }}
            className="order-2 overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-[0_2px_4px_rgba(0,0,0,0.04),0_8px_24px_rgba(0,0,0,0.08),0_24px_56px_rgba(0,0,0,0.07)] ring-1 ring-slate-900/5 dark:border-slate-700/50 dark:bg-slate-800 dark:shadow-[0_2px_4px_rgba(0,0,0,0.2),0_8px_24px_rgba(0,0,0,0.3),0_24px_56px_rgba(0,0,0,0.35)] dark:ring-white/6"
          >
            {/* Panel header */}
            <div className="relative flex items-center justify-between border-b border-slate-100 bg-white px-5 py-4 dark:border-slate-700 dark:bg-slate-800/80">
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-slate-100 dark:border-slate-700 dark:bg-slate-700">
                  <HiOutlineChartBar className="h-4 w-4 text-slate-700 dark:text-slate-200" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                    Research Insights
                  </p>
                  <p className="text-[11px] text-slate-700 dark:text-slate-400">
                    Live funding intelligence
                  </p>
                </div>
              </div>
              <HeroBadge
                label="Last Updated:"
                value={new Date().toLocaleDateString("en-US", {
                  month: "long",
                  year: "numeric",
                  day: "numeric",
                })}
              />
            </div>

            <div className="divide-y divide-slate-100 dark:divide-slate-700">
              {/* Grant Status */}
              <div className="p-5">
                <p className="mb-4 text-[10px] font-semibold tracking-widest text-slate-400 uppercase dark:text-slate-500">
                  Grant Status
                </p>
                <div className="grid grid-cols-3 gap-2.5">
                  {isLoadingStats
                    ? [...Array(3)].map((_, i) => (
                        <div
                          key={i}
                          className="h-16 animate-pulse rounded-xl bg-slate-100 dark:bg-slate-700"
                        />
                      ))
                    : [
                        {
                          label: "Active",
                          value: grantStats?.active || 0,
                          dot: "bg-success-500",
                          num: "text-slate-600 dark:text-success-100",
                          top: "border-t-success-500/80",
                          badge: "bg-success-50 dark:bg-success-900/30",
                          labelCls: "text-success-600 dark:text-success-300",
                          darkCard:
                            "dark:border-success-700/45 dark:from-success-950/35 dark:to-slate-800/80",
                        },
                        {
                          label: "Closed",
                          value: grantStats?.closed || 0,
                          dot: "bg-danger-500",
                          num: "text-slate-600 dark:text-danger-100",
                          top: "border-t-danger-500/80",
                          badge: "bg-danger-50 dark:bg-danger-900/30",
                          labelCls: "text-danger-600 dark:text-danger-300",
                          darkCard:
                            "dark:border-danger-800/45 dark:from-danger-950/30 dark:to-slate-800/80",
                        },
                        {
                          label: "Archived",
                          value: grantStats?.archived || 0,
                          dot: "bg-slate-400",
                          num: "text-slate-500 dark:text-slate-400",
                          top: "border-t-slate-400",
                          badge: "bg-slate-100 dark:bg-slate-700/50",
                          labelCls: "text-slate-500 dark:text-slate-400",
                        },
                      ].map((stat, idx) => (
                        <div
                          key={idx}
                          className={`flex flex-col gap-2 rounded-lg border border-t-2 border-slate-100 bg-linear-to-b from-slate-50/95 to-white p-3 shadow-[0_1px_2px_rgba(15,23,42,0.06)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_6px_18px_rgba(15,23,42,0.12)] dark:border-slate-700/40 dark:from-slate-700/70 dark:to-slate-800/75 dark:shadow-[0_1px_2px_rgba(0,0,0,0.25)] dark:hover:shadow-[0_8px_24px_rgba(0,0,0,0.38)] ${stat.top} ${stat.darkCard ?? ""}`}
                        >
                          <div
                            className={`inline-flex w-fit items-center gap-1.5 rounded-full px-2 py-0.5 ${stat.badge}`}
                          >
                            <span
                              className={`h-1.5 w-1.5 rounded-full ${stat.dot}`}
                            />
                            <span
                              className={`text-[10px] font-semibold ${stat.labelCls}`}
                            >
                              {stat.label}
                            </span>
                          </div>
                          <p
                            className={`text-xl font-black tabular-nums ${stat.num}`}
                          >
                            {formatNumber(stat.value)}
                          </p>
                        </div>
                      ))}
                </div>
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <HeroBadge
                    showDot={false}
                    label="Added Grants last 7 days:"
                    value={formatNumber(grantStats?.recent7Days || 0)}
                  />
                  <HeroBadge
                    showDot={false}
                    label=" Added Grants last 30 days:"
                    value={formatNumber(grantStats?.recent4Weeks || 0)}
                  />
                </div>
              </div>

              {/* Funding by area */}
              <div className="p-5">
                <p className="mb-4 text-[10px] font-semibold tracking-widest text-slate-400 uppercase dark:text-slate-500">
                  Funding by Research Area
                </p>
                {isLoadingStats ? (
                  <div className="space-y-3">
                    {[...Array(4)].map((_, i) => (
                      <div
                        key={i}
                        className="h-7 animate-pulse rounded-lg bg-slate-200 dark:bg-slate-700"
                      />
                    ))}
                  </div>
                ) : (
                  <div className="space-y-3.5">
                    {(() => {
                      const fields = [
                        {
                          label: "Health & Medicine",
                          value: grantStats?.byCategory.health || 0,
                          icon: HiOutlineHeart,
                          bar: "bg-success-500/85 dark:bg-success-400/75",
                          iconCls: "text-slate-600 dark:text-slate-300",
                        },
                        {
                          label: "Science & Tech",
                          value: grantStats?.byCategory.scienceTech || 0,
                          icon: HiOutlineChip,
                          bar: "bg-primary-600/80 dark:bg-primary-400/70",
                          iconCls: "text-slate-600 dark:text-slate-300",
                        },
                        {
                          label: "Education",
                          value: grantStats?.byCategory.education || 0,
                          icon: HiOutlineAcademicCap,
                          bar: "bg-secondary-600/70 dark:bg-secondary-400/65",
                          iconCls: "text-slate-600 dark:text-slate-300",
                        },
                        {
                          label: "Agriculture",
                          value: grantStats?.byCategory.agriculture || 0,
                          icon: HiOutlineGlobeAlt,
                          bar: "bg-warning-600/70 dark:bg-warning-400/65",
                          iconCls: "text-slate-600 dark:text-slate-300",
                        },
                      ];
                      const maxValue = Math.max(
                        ...fields.map((f) => f.value),
                        1
                      );
                      return fields.map((field, idx) => {
                        const Icon = field.icon;
                        const pct = (field.value / maxValue) * 100;
                        return (
                          <div key={idx}>
                            <div className="mb-1.5 flex items-center justify-between">
                              <div className="flex items-center gap-1.5">
                                <Icon
                                  className={`h-3.5 w-3.5 ${field.iconCls}`}
                                />
                                <span className="text-xs font-medium text-slate-600 dark:text-slate-300">
                                  {field.label}
                                </span>
                              </div>
                              <span className="text-[11px] font-semibold text-slate-500 tabular-nums dark:text-slate-400">
                                {formatNumber(field.value)}
                              </span>
                            </div>
                            <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-700/80">
                              <motion.div
                                initial={{ width: 0 }}
                                whileInView={{ width: `${pct}%` }}
                                transition={{
                                  duration: 0.6,
                                  delay: idx * 0.08,
                                  ease: [0.22, 1, 0.36, 1] as const,
                                }}
                                viewport={{ once: false }}
                                className={`h-full rounded-full ${field.bar}`}
                              />
                            </div>
                          </div>
                        );
                      });
                    })()}
                  </div>
                )}
              </div>

              {/* Platform features — 2×2 grid */}
              <div className="p-5">
                <p className="mb-3 text-[10px] font-semibold tracking-widest text-slate-400 uppercase dark:text-slate-500">
                  Platform Features
                </p>
                <div className="grid grid-cols-2 gap-2.5">
                  {FEATURES.map(({ icon: Icon, label, desc }, idx) => (
                    <div
                      key={idx}
                      className="flex items-start gap-2.5 rounded-lg border border-slate-100 bg-slate-50/70 p-3 transition-all duration-200 hover:-translate-y-0.5 hover:border-slate-200 hover:bg-white hover:shadow-[0_8px_18px_rgba(15,23,42,0.08)] dark:border-slate-700/40 dark:bg-slate-700/40 dark:hover:border-slate-600/60 dark:hover:bg-slate-700/60 dark:hover:shadow-[0_8px_20px_rgba(0,0,0,0.28)]"
                    >
                      <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-slate-100 dark:bg-slate-600/60">
                        <Icon className="h-3.5 w-3.5 text-slate-600 dark:text-slate-300" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-slate-700 dark:text-slate-200">
                          {label}
                        </p>
                        <p className="mt-0.5 text-[11px] leading-snug text-slate-600 dark:text-slate-400">
                          {desc}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* CTA */}
              <div className="flex items-center justify-between border-t border-slate-100 bg-slate-50/70 px-5 py-4 dark:border-slate-700 dark:bg-slate-800/70">
                <div>
                  <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                    Ready to get started?
                  </p>
                  <p className="text-[11px] text-slate-700 dark:text-slate-300">
                    Join researchers worldwide
                  </p>
                </div>
                <Button href="/login" size="sm" variant="solid">
                  <span className="inline-flex items-center gap-1">
                    Sign up free
                    <HiArrowRight className="h-3.5 w-3.5" />
                  </span>
                </Button>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
};

export default Hero;
