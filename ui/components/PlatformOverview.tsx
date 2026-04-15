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
      iconColor: "text-slate-600 dark:text-slate-300",
      accent: "border-l-slate-300 dark:border-l-slate-600",
      delay: 0,
    },
    {
      icon: <HiOutlineUserGroup className="h-5 w-5" />,
      step: "02",
      title: "Connect with Researchers",
      description:
        "Find collaborators who share your research interests and build your team.",
      iconColor: "text-slate-600 dark:text-slate-300",
      accent: "border-l-slate-300 dark:border-l-slate-600",
      delay: 0.1,
    },
    {
      icon: <HiOutlineDocumentReport className="h-5 w-5" />,
      step: "03",
      title: "Collaborate & Innovate",
      description:
        "Use integrated tools to write proposals, share resources, and track progress together.",
      iconColor: "text-slate-600 dark:text-slate-300",
      accent: "border-l-slate-300 dark:border-l-slate-600",
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
                y: reduceMotion ? 0 : -3,
                transition: { duration: 0.2 },
              }}
              className="group"
            >
              <div
                className={`relative h-full overflow-hidden rounded-xl border border-l-2 border-slate-200/80 bg-white p-5 shadow-[0_2px_10px_rgba(0,0,0,0.05)] transition-shadow hover:shadow-[0_6px_20px_rgba(0,0,0,0.09)] dark:border-slate-700/60 dark:bg-slate-800 dark:shadow-[0_2px_10px_rgba(0,0,0,0.25)] dark:hover:shadow-[0_6px_20px_rgba(0,0,0,0.4)] ${step.accent}`}
              >
                <div className="mb-4 flex items-center justify-between">
                  <span className={step.iconColor}>{step.icon}</span>
                  <span className="text-2xl font-black text-slate-100 tabular-nums dark:text-slate-800">
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
          className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3"
        >
          {[
            {
              title: "Team Spaces",
              desc: "Focused collaboration with shared context and access control.",
              iconCls: "text-slate-600 dark:text-slate-300",
            },
            {
              title: "Global Discovery",
              desc: "Cross-platform visibility for grants, collaborators, and research updates.",
              iconCls: "text-slate-600 dark:text-slate-300",
            },
            {
              title: "Real-time Coordination",
              desc: "Structured discussions to keep teams aligned and execution-ready.",
              iconCls: "text-slate-600 dark:text-slate-300",
            },
          ].map((cap, idx) => (
            <div
              key={idx}
              className="flex items-start gap-3 rounded-xl border border-slate-200/80 bg-white p-4 shadow-[0_1px_6px_rgba(0,0,0,0.04)] dark:border-slate-700/60 dark:bg-slate-800 dark:shadow-[0_1px_6px_rgba(0,0,0,0.2)]"
            >
              <div>
                <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                  {cap.title}
                </p>
                <p className="mt-0.5 text-xs leading-relaxed text-slate-500 dark:text-slate-400">
                  {cap.desc}
                </p>
              </div>
            </div>
          ))}
        </motion.div>
      </div>
    </section>
  );
};

export default PlatformOverview;
