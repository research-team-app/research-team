"use client";

import { motion, useReducedMotion } from "framer-motion";
import SectionHeader from "./SectionHeader";

const impactData = [
  {
    id: "01",
    title: "Higher Grant Success Rate",
    description:
      "Targeted grant discovery helps researchers find and apply for opportunities that closely match their work.",
    delay: 0,
  },
  {
    id: "02",
    title: "More Research Publications",
    description:
      "Collaborative tools help teams align on shared goals and coordinate proposal writing more effectively.",
    delay: 0.08,
  },
  {
    id: "03",
    title: "Wider Professional Network",
    description:
      "Connect with interdisciplinary collaborators beyond your institution and discover expertise across research fields.",
    delay: 0.16,
  },
  {
    id: "04",
    title: "Faster Project Completion",
    description:
      "Real-time messaging and shared workspaces reduce coordination overhead so teams can focus on the research.",
    delay: 0.24,
  },
];

const Impact = () => {
  const reduceMotion = useReducedMotion();

  return (
    <section
      className="relative overflow-hidden py-10 sm:py-12 lg:py-16"
      id="research-impact"
    >
      <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <SectionHeader
          sectionName="Research Impact"
          title="From Individual Work to Team-Driven Impact"
          description="Create specialized teams, collaborate through a global feed, and coordinate in real-time messaging to move research forward faster."
        />

        <motion.div
          initial={{ opacity: 0, y: reduceMotion ? 0 : 14 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-30px" }}
          transition={{ duration: 0.5, ease: [0.22, 0.5, 0.3, 0.9] }}
        >
          <div className="relative overflow-hidden rounded-2xl border border-slate-300/75 bg-linear-to-br from-white/80 via-stone-50/70 to-zinc-100/60 shadow-[0_10px_26px_rgba(15,23,42,0.10)] backdrop-blur-2xl dark:border-white/10 dark:bg-linear-to-br dark:from-slate-800 dark:via-slate-800 dark:to-slate-700/85 dark:shadow-[0_12px_30px_rgba(2,6,23,0.5)]">
            <div className="pointer-events-none absolute -top-20 -right-16 h-56 w-56 rounded-full bg-zinc-200/35 blur-3xl dark:bg-slate-500/10" />
            <div className="pointer-events-none absolute -bottom-24 -left-16 h-56 w-56 rounded-full bg-stone-200/30 blur-3xl dark:bg-slate-400/10" />
            <div className="absolute inset-x-0 top-0 h-px bg-linear-to-r from-transparent via-white/90 to-transparent dark:via-white/20" />
            <div className="grid grid-cols-1 divide-y divide-slate-300/65 sm:grid-cols-2 sm:divide-x sm:divide-y-0 dark:divide-slate-700/70">
              {impactData.map((item) => (
                <motion.div
                  key={item.title}
                  initial={{ opacity: 0, y: reduceMotion ? 0 : 10 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{
                    duration: 0.4,
                    delay: item.delay,
                    ease: [0.22, 0.5, 0.3, 0.9],
                  }}
                  className="group relative p-5 sm:p-6"
                >
                  <div className="mb-3 flex items-center gap-3">
                    <span className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-slate-300/75 bg-white/70 text-[11px] font-bold tracking-wider text-slate-700 backdrop-blur-sm dark:border-white/10 dark:bg-slate-700/70 dark:text-slate-200">
                      {item.id}
                    </span>
                    <h3 className="text-sm font-bold text-slate-900 sm:text-base dark:text-slate-50">
                      {item.title}
                    </h3>
                  </div>
                  <p className="text-xs leading-relaxed text-slate-500 sm:text-sm dark:text-slate-400">
                    {item.description}
                  </p>
                  <div className="mt-4 h-px w-full bg-linear-to-r from-slate-400/35 via-slate-300/15 to-transparent dark:from-slate-500/35 dark:via-slate-400/10" />
                </motion.div>
              ))}
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default Impact;
