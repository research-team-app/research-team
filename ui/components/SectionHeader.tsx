"use client";

import { motion, useReducedMotion } from "framer-motion";

const SectionHeader = ({
  sectionName,
  title,
  description,
}: {
  sectionName: string;
  title: string;
  description: string;
}) => {
  const reduceMotion = useReducedMotion();

  return (
    <motion.div
      initial={{ opacity: 0, y: reduceMotion ? 0 : 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration: 0.5, ease: [0.22, 0.5, 0.3, 0.9] }}
      className="mb-8 text-center sm:mb-10"
    >
      {/* Section label */}
      <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3.5 py-1.5 shadow-sm dark:border-slate-700 dark:bg-slate-800/80">
        <span className="bg-primary-500 dark:bg-primary-400 h-1.5 w-1.5 rounded-full" />
        <span className="text-[11px] font-semibold tracking-widest text-slate-500 uppercase dark:text-slate-400">
          {sectionName}
        </span>
      </div>

      {/* Title */}
      <h2 className="mb-3 px-4 text-2xl font-black tracking-tight text-slate-900 sm:text-3xl md:text-4xl dark:text-white">
        {title}
      </h2>

      {/* Description */}
      <p className="mx-auto max-w-2xl px-4 text-sm leading-relaxed text-slate-500 sm:text-base dark:text-slate-400">
        {description}
      </p>
    </motion.div>
  );
};

export default SectionHeader;
