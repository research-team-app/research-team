"use client";

import { FiSearch } from "react-icons/fi";
import { HiOutlineDocumentReport, HiOutlineUserGroup } from "react-icons/hi";
import { motion, useReducedMotion } from "framer-motion";
import SectionHeader from "./SectionHeader";

const PlatformOverview = () => {
  const reduceMotion = useReducedMotion();

  const steps = [
    {
      icon: <FiSearch className="h-5 w-5" />,
      step: "01",
      title: "Discover Opportunities",
      description:
        "Search grants and funding from universities, government agencies, and private foundations.",
      iconColor: "text-primary-700 dark:text-primary-300",
      delay: 0,
    },
    {
      icon: <HiOutlineUserGroup className="h-5 w-5" />,
      step: "02",
      title: "Connect with Researchers",
      description:
        "Find collaborators who share your research interests and build your team.",
      iconColor: "text-secondary-700 dark:text-secondary-300",
      delay: 0.1,
    },
    {
      icon: <HiOutlineDocumentReport className="h-5 w-5" />,
      step: "03",
      title: "Collaborate & Innovate",
      description:
        "Use integrated tools to write proposals, share resources, and track progress together.",
      iconColor: "text-emerald-700 dark:text-emerald-300",
      delay: 0.2,
    },
  ];

  return (
    <section className="relative overflow-hidden py-10 sm:py-12 lg:py-16">
      <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <SectionHeader
          sectionName="Simple Process"
          title="How Our Platform Works"
          description="Find grants, form teams, and collaborate — in three steps."
        />

        {/* Steps */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {steps.map((step, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: reduceMotion ? 0 : 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{
                duration: 0.45,
                delay: step.delay,
                ease: [0.22, 0.5, 0.3, 0.9],
              }}
              whileHover={{
                y: 0,
                transition: { duration: 0.2 },
              }}
              className="group"
            >
              <div className="relative h-full overflow-hidden rounded-2xl border border-slate-300/75 bg-white/65 p-5 shadow-[0_10px_26px_rgba(15,23,42,0.10)] backdrop-blur-2xl transition-all dark:border-white/10 dark:bg-slate-800 dark:shadow-[0_12px_30px_rgba(2,6,23,0.5)]">
                <div className="absolute inset-x-0 top-0 h-px bg-linear-to-r from-transparent via-white/90 to-transparent dark:via-white/20" />
                <div className="mb-4 flex items-center justify-between">
                  <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-white/70 bg-white/75 shadow-[0_4px_14px_rgba(15,23,42,0.08)] backdrop-blur-sm dark:border-white/10 dark:bg-slate-800/70 dark:shadow-[0_8px_20px_rgba(2,6,23,0.35)]">
                    <span className={step.iconColor}>{step.icon}</span>
                  </span>
                  <span className="text-2xl font-black text-slate-300/60 tabular-nums dark:text-slate-600/55">
                    {step.step}
                  </span>
                </div>
                <h3 className="mb-1.5 text-base font-bold text-slate-900 dark:text-slate-50">
                  {step.title}
                </h3>
                <p className="text-sm leading-relaxed text-slate-500 dark:text-slate-400">
                  {step.description}
                </p>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Capabilities row */}
        <motion.div
          initial={{ opacity: 0, y: reduceMotion ? 0 : 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.45, delay: 0.3 }}
          className="mt-5"
        >
          <div className="relative overflow-hidden rounded-2xl border border-slate-300/75 bg-white/60 shadow-[0_12px_28px_rgba(15,23,42,0.10)] backdrop-blur-2xl dark:border-white/10 dark:bg-slate-800 dark:shadow-[0_14px_30px_rgba(2,6,23,0.45)]">
            <div className="absolute inset-x-0 top-0 h-px bg-linear-to-r from-transparent via-white/90 to-transparent dark:via-white/20" />
            <div className="grid grid-cols-1 divide-y divide-slate-300/65 sm:grid-cols-3 sm:divide-x sm:divide-y-0 dark:divide-slate-700/70">
              {[
                {
                  title: "Team Spaces",
                  desc: "Focused collaboration with shared context and access control.",
                },
                {
                  title: "Global Discovery",
                  desc: "Cross-platform visibility for grants, collaborators, and research updates.",
                },
                {
                  title: "Real-time Coordination",
                  desc: "Structured discussions to keep teams aligned and execution-ready.",
                },
              ].map((cap, idx) => (
                <div key={idx} className="p-4 sm:p-5">
                  <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                    {cap.title}
                  </p>
                  <p className="mt-1 text-xs leading-relaxed text-slate-500 dark:text-slate-400">
                    {cap.desc}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default PlatformOverview;
