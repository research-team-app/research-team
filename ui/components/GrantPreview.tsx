"use client";

import { motion } from "framer-motion";
import { FiAward, FiChevronRight } from "react-icons/fi";
import { useRouter } from "next/navigation";
import GrantSummaryCard from "./GrantSummaryCard";
import { type CachedGrant, useGrantStore } from "../store/useGrantStore";
import SectionHeader from "./SectionHeader";
import Button from "@/components/ui/Button";

const GrantPreview = () => {
  const { data: grants, isLoading, isError } = useGrantStore();
  const router = useRouter();

  if (isLoading || !grants || isError) {
    return <></>;
  }

  // Get the first 3 grants for preview
  const previewGrants = (grants as CachedGrant[]).slice(0, 3);

  return (
    <section
      id="grants"
      className="relative overflow-hidden py-10 sm:py-14 lg:py-20"
    >
      <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <SectionHeader
          sectionName="Featured Grants"
          title="Explore Funding Opportunities"
          description="Explore the latest funding opportunities available for researchers in various disciplines and institutions."
        />

        {/* Grants Grid */}
        {previewGrants.length > 0 ? (
          <>
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 sm:gap-7 lg:grid-cols-3 lg:gap-8">
              {previewGrants.map((grant, index) => (
                <GrantSummaryCard
                  key={grant.id}
                  grant={grant}
                  isWishlisted={false}
                  isLoggedIn={false}
                  onWishlistToggle={undefined}
                  animationDelay={index * 0.1}
                />
              ))}
            </div>

            {/* Bottom CTA */}
            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              className="mt-10 text-center sm:mt-12"
            >
              <Button
                intent="primary"
                variant="outline"
                onClick={() => router.push("/grants")}
              >
                Browse All Available Grants
              </Button>

              {/* Additional Info */}
              <div className="mt-6 flex items-center justify-center gap-2 text-xs font-semibold text-slate-600 sm:text-sm dark:text-slate-400">
                <div className="h-px w-8 bg-linear-to-r from-transparent to-slate-400 dark:to-slate-600" />
                <span>Regularly updated with new opportunities</span>
                <div className="h-px w-8 bg-linear-to-l from-transparent to-slate-400 dark:to-slate-600" />
              </div>
            </motion.div>
          </>
        ) : (
          // Empty State
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            className="py-8 text-center"
          >
            {/* Icon Container */}
            <motion.div
              initial={{ scale: 0 }}
              whileInView={{ scale: 1 }}
              viewport={{ once: true }}
              transition={{
                type: "spring",
                stiffness: 200,
                damping: 15,
                delay: 0.2,
              }}
              className="mb-6 inline-flex h-20 w-20 items-center justify-center rounded-full bg-linear-to-br from-slate-100 to-slate-200 shadow-lg ring-4 ring-white sm:mb-8 sm:h-24 sm:w-24 dark:from-slate-800 dark:to-slate-900 dark:ring-slate-950"
            >
              <FiAward className="h-10 w-10 text-slate-400 sm:h-12 sm:w-12 dark:text-slate-600" />
            </motion.div>

            {/* Empty State Title */}
            <h3 className="mb-3 text-xl font-extrabold text-slate-900 sm:mb-4 sm:text-2xl lg:text-3xl dark:text-slate-50">
              No Grants Available
            </h3>

            {/* Empty State Description */}
            <p className="mx-auto mb-8 max-w-md px-4 text-sm text-slate-600 sm:mb-10 sm:text-base lg:text-lg dark:text-slate-400">
              We&apos;re currently updating our grant database. Check back soon
              for new funding opportunities.
            </p>

            {/* Empty State CTA */}
            <Button endIcon={<FiChevronRight className="h-5 w-5" />}>
              View All Grants
            </Button>
          </motion.div>
        )}
      </div>
    </section>
  );
};

export default GrantPreview;
