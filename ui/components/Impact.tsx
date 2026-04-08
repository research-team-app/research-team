"use client";

import { motion, useReducedMotion } from "framer-motion";
import SectionHeader from "./SectionHeader";

const impactData = [
  {
    stat: "",
    title: "Higher Grant Success Rate",
    description:
      "Targeted grant discovery helps researchers find and apply for opportunities that closely match their work.",
    accent: "border-l-gray-400 dark:border-l-gray-600",
    delay: 0,
  },
  {
    stat: "",
    title: "More Research Publications",
    description:
      "Collaborative tools help teams align on shared goals and coordinate proposal writing more effectively.",
    accent: "border-l-gray-400 dark:border-l-gray-600",
    delay: 0.08,
  },
  {
    stat: "",
    title: "Wider Professional Network",
    description:
      "Connect with interdisciplinary collaborators beyond your institution and discover expertise across research fields.",
    accent: "border-l-gray-400 dark:border-l-gray-600",
    delay: 0.16,
  },
  {
    stat: "",
    title: "Faster Project Completion",
    description:
      "Real-time messaging and shared workspaces reduce coordination overhead so teams can focus on the research.",
    accent: "border-l-gray-400 dark:border-l-gray-600",
    delay: 0.24,
  },
];

const Impact = () => {
  const reduceMotion = useReducedMotion();

  return (
    <section className="relative overflow-hidden py-10 sm:py-12 lg:py-16">
      <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <SectionHeader
          sectionName="Research Impact"
          title="From Individual Work to Team-Driven Impact"
          description="Create specialized teams, collaborate through a global feed, and coordinate in real-time messaging to move research forward faster."
        />

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {impactData.map((item, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: reduceMotion ? 0 : 14 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-30px" }}
              transition={{
                duration: 0.45,
                delay: item.delay,
                ease: [0.22, 0.5, 0.3, 0.9],
              }}
              whileHover={{
                y: reduceMotion ? 0 : -3,
                transition: { duration: 0.2 },
              }}
            >
              <div
                className={`flex h-full flex-col justify-center rounded-xl border border-l-2 border-slate-200/80 bg-white p-5 shadow-[0_2px_10px_rgba(0,0,0,0.05)] transition-shadow hover:shadow-[0_6px_20px_rgba(0,0,0,0.09)] dark:border-slate-700/60 dark:bg-slate-900 dark:shadow-[0_2px_10px_rgba(0,0,0,0.25)] dark:hover:shadow-[0_6px_20px_rgba(0,0,0,0.4)] ${item.accent}`}
              >
                <h3 className="mb-1.5 text-sm font-bold text-slate-900 sm:text-base dark:text-slate-50">
                  {item.title}
                </h3>
                <p className="text-xs leading-relaxed text-slate-500 sm:text-sm dark:text-slate-400">
                  {item.description}
                </p>
              </div>
            </motion.div>
          ))}
        </div>

      </div>
    </section>
  );
};

export default Impact;
