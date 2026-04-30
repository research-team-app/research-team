"use client";

import {
  FiCheckCircle,
  FiUsers,
  FiMapPin,
  FiClock,
  FiLinkedin,
  FiSend,
  FiMessageCircle,
  FiArrowRight,
  FiGithub,
} from "react-icons/fi";
import { motion } from "framer-motion";
import React, { useState } from "react";
import { useForm } from "react-hook-form";
import Toast from "./ui/Toast";
import { API_URL } from "../data/global";
import SectionHeader from "./SectionHeader";
import Button from "@/components/ui/Button";
import InputField from "@/components/ui/InputField";
import TextArea from "@/components/ui/TextArea";
import Badge from "./ui/Badge";
import ErrorMessage from "./Errormessage";

interface ContactFormData {
  firstname: string;
  lastname: string;
  email: string;
  subject: string;
  message: string;
}

const Contact: React.FC = () => {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
  } = useForm<ContactFormData>({
    defaultValues: {
      firstname: "",
      lastname: "",
      email: "",
      subject: "",
      message: "",
    },
    mode: "onBlur",
  });

  const [toast, setToast] = useState<{
    isOpen: boolean;
    message: string;
    variant: "success" | "error" | "info";
  }>({ isOpen: false, message: "", variant: "info" });

  const onSubmit = async (data: ContactFormData) => {
    setToast((t) => ({ ...t, isOpen: false }));
    try {
      const res = await fetch(`${API_URL}/contact-us`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify(data),
      });

      if (!res.ok) {
        const text = await res.text();
        let detail = `Request failed (${res.status})`;
        try {
          const j = JSON.parse(text) as { detail?: unknown };
          if (j?.detail != null)
            detail =
              typeof j.detail === "string"
                ? j.detail
                : JSON.stringify(j.detail);
          else if (text) detail = text.slice(0, 300);
        } catch {
          if (text) detail = text.slice(0, 300);
        }
        throw new Error(detail);
      }

      reset();
      setToast({
        isOpen: true,
        message: "Message sent successfully! We'll get back to you soon.",
        variant: "success",
      });
    } catch (err: unknown) {
      setToast({
        isOpen: true,
        message: err instanceof Error ? err.message : "Unexpected error",
        variant: "error",
      });
    }
  };

  return (
    <section
      className="relative overflow-hidden py-12 lg:py-16"
      id="contact-us-section"
    >
      <SectionHeader
        sectionName="Contact Us"
        title="Get in Touch with Our Research Team"
        description="Have questions about our research platform? Our team is here to help you with any inquiries you might have."
      />

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12 lg:gap-8">
          {/* Left Side - Info Section */}
          <motion.div
            initial={false}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="space-y-5 lg:col-span-5"
          >
            {/* Start Journey Card */}
            <div className="relative overflow-hidden rounded-2xl border border-slate-300/75 bg-white/65 shadow-[0_12px_28px_rgba(15,23,42,0.10)] backdrop-blur-2xl dark:border-white/10 dark:bg-slate-800 dark:shadow-[0_14px_30px_rgba(2,6,23,0.45)]">
              <div className="absolute inset-x-0 top-0 h-px bg-linear-to-r from-transparent via-white/90 to-transparent dark:via-white/20" />
              <div className="relative p-6 sm:p-7">
                <div className="mb-4">
                  <Badge icon={<FiCheckCircle className="h-3.5 w-3.5" />}>
                    Join Today
                  </Badge>
                </div>

                <h2 className="mb-3 text-2xl font-bold text-slate-900 dark:text-white">
                  Start Your Research Journey
                </h2>
                <p className="mb-6 text-sm leading-relaxed text-slate-600 dark:text-slate-400">
                  Join researchers who are collaborating and discovering funding
                  opportunities on our platform.
                </p>

                <Button
                  startIcon={<FiUsers className="h-5 w-5" />}
                  endIcon={<FiArrowRight className="h-4 w-4" />}
                  href="/login"
                >
                  Create Your Account
                </Button>
              </div>
            </div>

            {/* Contact Info Card */}
            <div className="relative overflow-hidden rounded-2xl border border-slate-300/75 bg-white/65 p-6 shadow-[0_12px_28px_rgba(15,23,42,0.10)] backdrop-blur-2xl sm:p-7 dark:border-white/10 dark:bg-slate-800 dark:shadow-[0_14px_30px_rgba(2,6,23,0.45)]">
              <div className="absolute inset-x-0 top-0 h-px bg-linear-to-r from-transparent via-white/90 to-transparent dark:via-white/20" />
              <div className="mb-6 flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-slate-300/75 bg-white/70 backdrop-blur-sm dark:border-white/10 dark:bg-slate-700/70">
                  <FiMessageCircle className="h-6 w-6 text-slate-600 dark:text-slate-300" />
                </div>
                <h3 className="text-xl font-bold text-slate-900 dark:text-white">
                  Get in Touch
                </h3>
              </div>

              <p className="mb-6 text-sm leading-relaxed text-slate-600 dark:text-slate-400">
                Our team is available to answer your questions and provide
                support for your research needs.
              </p>

              <div className="space-y-3">
                <motion.div
                  className="flex items-start gap-4 rounded-xl border border-slate-300/70 bg-white/60 p-4 backdrop-blur-sm dark:border-white/10 dark:bg-slate-700/60"
                  whileHover={{ x: 0 }}
                >
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-slate-300/75 bg-white/70 dark:border-white/10 dark:bg-slate-700/70">
                    <FiMapPin className="h-5 w-5 text-slate-600 dark:text-slate-300" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="mb-1 text-xs font-semibold tracking-wide text-slate-500 uppercase dark:text-slate-400">
                      Location
                    </div>
                    <div className="text-sm font-medium text-slate-900 dark:text-white">
                      Nashville, TN
                    </div>
                  </div>
                </motion.div>

                <motion.div
                  className="flex items-start gap-4 rounded-xl border border-slate-300/70 bg-white/60 p-4 backdrop-blur-sm dark:border-white/10 dark:bg-slate-700/60"
                  whileHover={{ x: 0 }}
                >
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-slate-300/75 bg-white/70 dark:border-white/10 dark:bg-slate-700/70">
                    <FiClock className="h-5 w-5 text-slate-600 dark:text-slate-300" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="mb-1 text-xs font-semibold tracking-wide text-slate-500 uppercase dark:text-slate-400">
                      Response Time
                    </div>
                    <div className="text-sm font-medium text-slate-900 dark:text-white">
                      Typically within 24 hours
                    </div>
                    <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                      Use the contact form to reach the team directly.
                    </p>
                  </div>
                </motion.div>
              </div>

              {/* Social Links */}
              <div className="mt-8 border-t border-slate-200 pt-6 dark:border-slate-700">
                <h4 className="mb-4 text-sm font-semibold text-slate-900 dark:text-white">
                  Connect With Us
                </h4>
                <div className="flex gap-3">
                  {[
                    {
                      icon: FiGithub,
                      label: "GitHub",
                      href: "https://github.com/[REDACTED FOR BLIND REVIEW]",
                    },
                    {
                      icon: FiLinkedin,
                      label: "LinkedIn",
                      href: "https://[REDACTED FOR BLIND REVIEW]",
                    },
                  ].map((social) => (
                    <motion.a
                      key={social.label}
                      href={social.href}
                      className="flex h-11 w-11 items-center justify-center rounded-xl border border-slate-300/75 bg-white/65 text-slate-600 backdrop-blur-sm transition-all duration-300 dark:border-white/10 dark:bg-slate-700/60 dark:text-slate-300"
                      aria-label={social.label}
                      whileHover={{ y: 0 }}
                      whileTap={{ scale: 0.95 }}
                    >
                      <social.icon className="h-5 w-5" />
                    </motion.a>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>

          {/* Right Side - Form Section */}
          <motion.div
            initial={false}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="lg:col-span-7"
          >
            <div className="relative overflow-hidden rounded-2xl border border-slate-300/75 bg-white/65 p-6 shadow-[0_12px_28px_rgba(15,23,42,0.10)] backdrop-blur-2xl sm:p-7 lg:p-8 dark:border-white/10 dark:bg-slate-800 dark:shadow-[0_14px_30px_rgba(2,6,23,0.45)]">
              <div className="absolute inset-x-0 top-0 h-px bg-linear-to-r from-transparent via-white/90 to-transparent dark:via-white/20" />
              <div className="mb-8">
                <div className="mb-4">
                  <Badge icon={<FiSend className="h-3.5 w-3.5" />}>
                    Send Message
                  </Badge>
                </div>
                <h3 className="mb-3 text-2xl font-bold text-slate-900 sm:text-3xl dark:text-white">
                  Let’s Start a Conversation
                </h3>
                <p className="text-slate-600 dark:text-slate-400">
                  Fill out the form below and our team will get back to you
                  within 24 hours.
                </p>
              </div>

              <form
                onSubmit={handleSubmit(onSubmit)}
                className="space-y-6"
                noValidate
              >
                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                  <div>
                    <InputField
                      label="First Name"
                      required
                      type="text"
                      placeholder="Enter First Name"
                      {...register("firstname", {
                        required: "First name is required.",
                      })}
                    />
                    <ErrorMessage error={errors.firstname} />
                  </div>

                  <div>
                    <InputField
                      label="Last Name"
                      required
                      type="text"
                      placeholder="Your Last name"
                      {...register("lastname", {
                        required: "Last name is required.",
                      })}
                    />
                    <ErrorMessage error={errors.lastname} />
                  </div>
                </div>

                <div>
                  <InputField
                    label="Email Address"
                    required
                    type="email"
                    placeholder="john.doe@example.com"
                    {...register("email", {
                      required: "Email is required.",
                      pattern: {
                        value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                        message: "Please enter a valid email.",
                      },
                    })}
                  />
                  <ErrorMessage error={errors.email} />
                </div>

                <div>
                  <InputField
                    label="Subject"
                    required
                    {...register("subject", {
                      required: "Subject is required.",
                    })}
                    placeholder="How can we help you?"
                  />
                  <ErrorMessage error={errors.subject} />
                </div>

                <div>
                  <TextArea
                    label=" Your Message"
                    required
                    rows={8}
                    placeholder="Tell us more about your inquiry..."
                    {...register("message", {
                      required: "Message is required.",
                    })}
                  />
                  <ErrorMessage error={errors.message} />
                </div>

                <div className="flex flex-col items-start gap-4 pt-4 sm:flex-row sm:items-center">
                  <Button
                    variant="solid"
                    type="submit"
                    disabled={isSubmitting}
                    startIcon={<FiSend className="h-5 w-5" />}
                  >
                    {isSubmitting ? "Sending..." : "Send Message"}
                  </Button>
                </div>

                {toast.isOpen && (
                  <Toast
                    isOpen={toast.isOpen}
                    onClose={() => setToast((t) => ({ ...t, isOpen: false }))}
                    position="top-right"
                    variant={toast.variant}
                    duration={10000}
                  >
                    {toast.message}
                  </Toast>
                )}
              </form>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default Contact;
