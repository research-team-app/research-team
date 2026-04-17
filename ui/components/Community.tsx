"use client";

import {
  HiOutlineUserGroup,
  HiOutlineAcademicCap,
  HiOutlineLightningBolt,
} from "react-icons/hi";
import { motion, useReducedMotion } from "framer-motion";
import { useRouter } from "next/navigation";
import SectionHeader from "./SectionHeader";
import Button from "@/components/ui/Button";

const stats = [
  {
    label: "Active Researchers",
    description: "Collaborating worldwide",
    icon: HiOutlineUserGroup,
    delay: 0,
  },
  {
    label: "Universities",
    description: "Global institutions",
    icon: HiOutlineAcademicCap,
    delay: 0.08,
  },
  {
    label: "Collaborations",
    description: "Active partnerships",
    icon: HiOutlineLightningBolt,
    delay: 0.16,
  },
];

const researchFields = [
  "Climate Science",
  "Quantum Physics",
  "AI & Machine Learning",
  "Biotechnology",
  "Neuroscience",
  "Astrophysics",
  "Renewable Energy",
  "Genomics",
  "Nanotechnology",
  "Marine Biology",
  "Data Science",
  "Robotics",
];

const Community = () => {
  const navigate = useRouter();
  const reduceMotion = useReducedMotion();

  const handleNavigate = () => navigate.push("/collaborators");

  return (
    <section
      id="collaborators"
      className="relative overflow-hidden py-10 sm:py-12 lg:py-16"
    >
      <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <SectionHeader
          sectionName="Global Research Community"
          title="Connect with Leading Researchers"
          description="Collaborate across disciplines, institutions, and borders. Discover expertise, spark ideas, and accelerate impactful outcomes."
        />

        {/* Stats */}
        <div className="mb-10 grid grid-cols-1 gap-4 sm:grid-cols-3">
          {stats.map((stat) => {
            const Icon = stat.icon;
            return (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: reduceMotion ? 0 : 14 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-30px" }}
                transition={{
                  duration: 0.45,
                  delay: stat.delay,
                  ease: [0.22, 0.5, 0.3, 0.9],
                }}
                whileHover={{ y: 0 }}
              >
                <div className="relative flex h-full items-center gap-4 overflow-hidden rounded-2xl border border-slate-300/75 bg-white/65 p-5 shadow-[0_10px_26px_rgba(15,23,42,0.10)] backdrop-blur-2xl dark:border-white/10 dark:bg-slate-800 dark:shadow-[0_12px_30px_rgba(2,6,23,0.5)]">
                  <div className="absolute inset-x-0 top-0 h-px bg-linear-to-r from-transparent via-white/90 to-transparent dark:via-white/20" />
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-slate-300/75 bg-white/75 backdrop-blur-sm dark:border-white/10 dark:bg-slate-700/70">
                    <Icon className="h-5 w-5 text-slate-600 dark:text-slate-300" />
                  </span>
                  <div>
                    <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                      {stat.label}
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {stat.description}
                    </p>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* Research Fields */}
        <motion.div
          initial={{ opacity: 0, y: reduceMotion ? 0 : 14 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-30px" }}
          transition={{
            duration: 0.45,
            delay: 0.2,
            ease: [0.22, 0.5, 0.3, 0.9],
          }}
          className="mb-10"
        >
          <p className="mb-4 text-center text-xs font-semibold tracking-widest text-slate-400 uppercase dark:text-slate-500">
            Diverse Areas of Discovery
          </p>
          <div className="mx-auto flex max-w-4xl flex-wrap justify-center gap-2">
            {researchFields.map((field, idx) => (
              <motion.div
                key={field}
                initial={{ opacity: 0, scale: 0.92 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.25, delay: 0.1 + idx * 0.03 }}
              >
                <div className="flex items-center gap-1.5 rounded-full border border-slate-300/75 bg-white/70 px-3.5 py-1.5 text-xs font-medium text-slate-600 shadow-[0_1px_4px_rgba(0,0,0,0.04)] backdrop-blur-sm dark:border-white/10 dark:bg-slate-800 dark:text-slate-300">
                  <span className="bg-primary-400 dark:bg-primary-500 h-1 w-1 rounded-full" />
                  {field}
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* CTA */}
        <motion.div
          initial={{ opacity: 0, y: reduceMotion ? 0 : 14 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{
            duration: 0.45,
            delay: 0.3,
            ease: [0.22, 0.5, 0.3, 0.9],
          }}
        >
          <div className="relative overflow-hidden rounded-2xl border border-slate-300/75 bg-white/65 p-8 text-center shadow-[0_10px_26px_rgba(15,23,42,0.10)] backdrop-blur-2xl sm:p-10 dark:border-white/10 dark:bg-slate-800 dark:shadow-[0_12px_30px_rgba(2,6,23,0.5)]">
            <div className="absolute inset-x-0 top-0 h-px bg-linear-to-r from-transparent via-white/90 to-transparent dark:via-white/20" />
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-slate-300/75 bg-white/70 px-3.5 py-1.5 backdrop-blur-sm dark:border-white/10 dark:bg-slate-700/70">
              <span className="h-1.5 w-1.5 rounded-full bg-green-400" />
              <span className="text-[11px] font-semibold tracking-widest text-slate-500 uppercase dark:text-slate-400">
                Start Collaborating Today
              </span>
            </div>

            <h3 className="mb-3 text-2xl font-black tracking-tight text-slate-900 sm:text-3xl dark:text-white">
              Ready to Find Your Next Collaborator?
            </h3>

            <p className="mx-auto mb-6 max-w-lg text-sm leading-relaxed text-slate-500 sm:text-base dark:text-slate-400">
              Explore profiles, start conversations, and build multidisciplinary
              teams that push the boundaries of discovery.
            </p>

            <Button
              intent="primary"
              size="lg"
              startIcon={<HiOutlineUserGroup className="h-4 w-4" />}
              onClick={handleNavigate}
            >
              Explore Researchers
            </Button>

            <p className="mt-5 text-xs text-slate-400 dark:text-slate-500">
              <span className="mr-1.5 inline-block h-1.5 w-1.5 rounded-full bg-green-400" />
              Open to researchers from all institutions
            </p>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default Community;
