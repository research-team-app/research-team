"use client";

import { useRef } from "react";
import { HiStar } from "react-icons/hi";
import { FaQuoteLeft } from "react-icons/fa";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { motion } from "framer-motion";
import SectionHeader from "./SectionHeader";
import Avatar from "./Avatar";

const Testimonials = () => {
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const testimonials = [
    {
      quote:
        "Finding relevant grants used to be time-consuming. Now, I receive personalized recommendations that match my interests perfectly.",
      name: "Bibek Dhungana",
      position: "Research Assistant",
      university: "Vanderbilt University",
      rating: 5,
      image: "",
    },
    {
      quote:
        "The collaborative tools are outstanding. My team worked simultaneously on computing research and finding grants.",
      name: "David Hyde",
      position: "Assistant Professor",
      university: "Vanderbilt University",
      rating: 5,
      image: "",
    },
  ];

  const scroll = (direction: "left" | "right") => {
    if (!scrollContainerRef.current) return;
    const container = scrollContainerRef.current;
    const scrollAmount = container.clientWidth * 0.8;

    container.scrollBy({
      left: direction === "right" ? scrollAmount : -scrollAmount,
      behavior: "smooth",
    });
  };

  return (
    <section
      id="testimonials"
      className="relative overflow-hidden py-10 sm:py-12 lg:py-16"
    >
      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <SectionHeader
          sectionName="Success Stories"
          title="Trusted by Top Researchers"
          description="See how academics are securing funding and accelerating their research with our platform."
        />

        {/* Carousel + Controls */}
        <div className="relative">
          <div
            ref={scrollContainerRef}
            className="-mx-4 flex snap-x snap-mandatory gap-4 overflow-x-auto scroll-smooth px-4 pb-4 sm:mx-0 sm:px-0 md:justify-center"
            style={{
              scrollbarWidth: "none", // Firefox
              msOverflowStyle: "none", // IE/Edge
            }}
          >
            {/* Hide scrollbar for WebKit */}
            <style jsx>{`
              section#testimonials ::-webkit-scrollbar {
                display: none;
              }
            `}</style>

            {testimonials.map((testimonial, index) => (
              <div
                key={index}
                className="xs:w-[85vw] w-[88vw] flex-none snap-center sm:w-[70vw] md:w-[45%] lg:w-[32%]"
              >
                <motion.div
                  initial={{ opacity: 0, y: 18 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-50px" }}
                  transition={{ duration: 0.35, delay: index * 0.08 }}
                  className="group relative flex h-full flex-col overflow-hidden rounded-xl border border-slate-200/80 bg-white p-5 shadow-[0_2px_10px_rgba(0,0,0,0.05)] transition-shadow hover:shadow-[0_6px_20px_rgba(0,0,0,0.09)] dark:border-slate-700/60 dark:bg-slate-900 dark:shadow-[0_2px_10px_rgba(0,0,0,0.25)] dark:hover:shadow-[0_6px_20px_rgba(0,0,0,0.4)]"
                >
                  {/* Decorative Quote Icon */}
                  <div className="pointer-events-none absolute top-5 right-5 opacity-10 dark:opacity-15">
                    <FaQuoteLeft className="text-primary-600 h-8 w-8" />
                  </div>

                  {/* Rating */}
                  <div className="mb-3 flex gap-1">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <HiStar
                        key={i}
                        className={`h-4 w-4 ${
                          i < testimonial.rating
                            ? "text-amber-400"
                            : "text-slate-200 dark:text-slate-700"
                        }`}
                      />
                    ))}
                  </div>

                  {/* Quote */}
                  <blockquote className="relative z-10 mb-5 flex-1">
                    <p className="text-[15px] leading-relaxed font-medium text-slate-700 sm:text-base dark:text-slate-200">
                      &quot;{testimonial.quote}&quot;
                    </p>
                  </blockquote>

                  {/* Author */}
                  <div className="mt-auto flex items-center gap-3 border-t border-slate-200 pt-4 dark:border-slate-700/70">
                    <Avatar
                      name={testimonial.name}
                      profileTitle={testimonial.position}
                      src={testimonial.image || undefined}
                      size={44}
                      className="shadow-sm ring-2 ring-white dark:ring-slate-700"
                      fallbackClassName="bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-100"
                      textClassName="text-xs"
                    />

                    <div className="flex min-w-0 flex-col">
                      <span
                        className="truncate text-base font-semibold text-slate-900 dark:text-slate-50"
                        title={testimonial?.name}
                      >
                        {testimonial?.name}
                      </span>
                      <span
                        className="truncate text-sm font-medium text-slate-600 dark:text-slate-400"
                        title={testimonial?.position}
                      >
                        {testimonial?.position}
                      </span>
                      {testimonial?.university && (
                        <span
                          className="truncate text-xs font-medium text-slate-500 dark:text-slate-400"
                          title={testimonial?.university}
                        >
                          {testimonial?.university}
                        </span>
                      )}
                    </div>
                  </div>
                </motion.div>
              </div>
            ))}
          </div>

          {/* Navigation Button */}
          {testimonials.length > 3 && (
            <div className="mt-4 flex items-center justify-center gap-2">
              <button
                type="button"
                onClick={() => scroll("left")}
                className="group flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 shadow-sm transition-all hover:border-slate-300 hover:bg-slate-50 active:scale-95 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:border-slate-600 dark:hover:bg-slate-800"
                aria-label="Previous testimonial"
              >
                <ArrowLeft className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => scroll("right")}
                className="group hover:border-primary-500 hover:bg-primary-50 hover:text-primary-600 dark:hover:border-primary-400 flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 shadow-sm transition-all active:scale-95 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
                aria-label="Next testimonial"
              >
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </button>
            </div>
          )}
        </div>
      </div>
    </section>
  );
};

export default Testimonials;
