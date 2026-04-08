"use client";

import { FiCheck, FiMessageCircle } from "react-icons/fi";
import { HiOutlineChartBar, HiOutlineGlobeAlt } from "react-icons/hi";
import { motion, useReducedMotion } from "framer-motion";
import SectionHeader from "./SectionHeader";

const Features = () => {
  const reduceMotion = useReducedMotion();

  const features = [
    {
      icon: HiOutlineGlobeAlt,
      title: "Research Network",
      description:
        "Connect with researchers across institutions and disciplines to form high-quality project teams and long-term collaborations.",
      highlights: [
        "Cross-institution",
        "Interdisciplinary",
        "Verified profiles",
      ],
      delay: 0,
    },
    {
      icon: HiOutlineChartBar,
      title: "Grant Matching",
      description:
        "Match relevant opportunities to your profile with transparent recommendation criteria and timely funding updates.",
      highlights: ["Profile-based", "Deadline alerts", "Relevance scoring"],
      delay: 0.2,
    },
    {
      icon: FiMessageCircle,
      title: "Research Collaboration Support",
      description:
        "Coordinate with collaborators and advisors to strengthen proposals, align responsibilities, and improve project execution.",
      highlights: ["Proposal planning", "Role alignment", "Shared context"],
      delay: 0.6,
    },
  ];

  return (
    <section
      id="features"
      className="relative overflow-hidden py-12 sm:py-16 lg:py-20"
    >
      <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <SectionHeader
          sectionName="Platform Capabilities"
          title="Built for Research Workflows"
          description="A focused platform for funding discovery, team formation, and collaboration."
        />

        <div className="relative mx-auto max-w-5xl">
          {features.map((feature, index) => {
            const Icon = feature.icon;

            return (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: reduceMotion ? 0 : 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-100px" }}
                transition={{
                  duration: 0.55,
                  delay: feature.delay,
                  ease: [0.22, 0.5, 0.3, 0.9],
                }}
                className="group relative mb-5 last:mb-0 lg:mb-6"
              >
                <div className="grid grid-cols-1 gap-3">
                  <div className="relative h-full overflow-hidden rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition-all duration-200 hover:border-slate-300 hover:shadow-md dark:border-slate-700 dark:bg-slate-900/85 dark:hover:border-slate-600">
                    <div className="mb-4 flex items-center gap-4">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-800">
                        <Icon className="size-5 text-slate-600 dark:text-slate-300" />
                      </div>
                      <h3 className="text-xl leading-tight font-bold text-slate-900 dark:text-white">
                        {feature.title}
                      </h3>
                    </div>

                    <p className="mb-5 text-base leading-relaxed text-slate-600 dark:text-slate-400">
                      {feature.description}
                    </p>

                    <div className="flex flex-wrap gap-2.5">
                      {feature.highlights.map((item) => (
                        <div
                          key={item}
                          className="flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                        >
                          <FiCheck className="h-3.5 w-3.5" />
                          <span>{item}</span>
                        </div>
                      ))}
                    </div>

                    <div className="bg-primary-500/70 dark:bg-primary-400/70 mt-5 h-1 w-24 rounded-full" />
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
        <div className="mt-6 flex items-center justify-center gap-2 text-xs font-semibold text-slate-600 sm:text-sm dark:text-slate-400">
          <div className="h-px w-8 bg-linear-to-r from-transparent to-slate-400 dark:to-slate-600" />
          <span>Built for researchers around the world</span>
          <div className="h-px w-8 bg-linear-to-l from-transparent to-slate-400 dark:to-slate-600" />
        </div>
      </div>
    </section>
  );
};

export default Features;
