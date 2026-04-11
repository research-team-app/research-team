"use client";

import { useState } from "react";
import { FiGithub, FiLinkedin, FiMail } from "react-icons/fi";
import { HiArrowRight } from "react-icons/hi";
import Logo from "./Logo";
import Link from "@/components/ui/Link";
import Toast from "@/components/ui/Toast";
import Button from "@/components/ui/Button";
import InputField from "@/components/ui/InputField";
import { API_URL } from "@/data/global";

const NAV_COLUMNS = [
  {
    title: "Platform",
    links: [
      { name: "Features", href: "/#features" },
      { name: "Research Impact", href: "/#research-impact" },
    ],
  },
  {
    title: "Resources",
    links: [
      { name: "Grants", href: "/grants" },
      { name: "Collaborators", href: "/collaborators" },
    ],
  },
  {
    title: "Company",
    links: [
      { name: "Contact us", href: "/#contact-us-section" },
      { name: "Report a bug", href: "/report-bug" },
      { name: "FAQs", href: "/faqs" },
    ],
  },
];

const SOCIALS = [
  {
    icon: FiLinkedin,
    label: "LinkedIn",
    href: "https://www.linkedin.com/company/research-team-app/?viewAsMember=true",
  },
  {
    icon: FiGithub,
    label: "GitHub",
    href: "https://github.com/research-team-app",
  },
  { icon: FiMail, label: "Email", href: "mailto:research.team.app@gmail.com" },
];

const LEGAL = [
  { name: "Privacy Policy", href: "/privacy-policy" },
  { name: "Terms of Service", href: "/terms-and-conditions" },
  { name: "Cookie Policy", href: "/cookie-policy" },
];

const Footer = () => {
  const [email, setEmail] = useState("");
  const [isSubmitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState<{
    isOpen: boolean;
    message: string;
    variant: "success" | "error" | "info";
  }>({ isOpen: false, message: "", variant: "info" });

  const handleSubscribe = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = email.trim();
    if (!trimmed || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      setToast({
        isOpen: true,
        message: "Please enter a valid email address.",
        variant: "error",
      });
      return;
    }
    setSubmitting(true);
    setToast({ isOpen: false, message: "", variant: "info" });
    try {
      const res = await fetch(`${API_URL}/mailing-list`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: trimmed }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const msg =
          typeof data?.detail === "string"
            ? data.detail
            : `Request failed (${res.status})`;
        throw new Error(msg);
      }
      setEmail("");
      setToast({
        isOpen: true,
        message: data?.message ?? "You're subscribed! We'll keep you updated.",
        variant: "success",
      });
    } catch (err) {
      setToast({
        isOpen: true,
        message:
          err instanceof Error
            ? err.message
            : "Subscription failed. Please try again.",
        variant: "error",
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <footer className="relative py-12 sm:py-16">
      <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* ── Top row: logo + socials ── */}
        <div className="mb-10 flex flex-col items-start justify-between gap-6 sm:flex-row sm:items-center">
          <Logo />
          <div className="flex items-center gap-1">
            {SOCIALS.map(({ icon: Icon, label, href }) => (
              <a
                key={label}
                href={href}
                aria-label={label}
                target="_blank"
                rel="noopener noreferrer"
                className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 dark:text-slate-500 dark:hover:bg-slate-800 dark:hover:text-slate-300"
              >
                <Icon className="h-4 w-4" />
              </a>
            ))}
          </div>
        </div>

        {/* ── Main grid: description + nav columns ── */}
        <div className="mb-10 grid grid-cols-1 gap-10 border-t border-slate-100 pt-10 sm:grid-cols-2 lg:grid-cols-4 dark:border-slate-800">
          {/* Brand column */}
          <div className="lg:pr-8">
            <p className="mb-1 text-xs font-semibold tracking-widest text-slate-400 uppercase dark:text-slate-500">
              About
            </p>
            <p className="mt-3 text-sm leading-relaxed text-slate-500 dark:text-slate-400">
              A unified workspace for researchers to discover funding, build
              teams, and advance science — together.
            </p>
          </div>

          {/* Nav columns */}
          {NAV_COLUMNS.map((col) => (
            <div key={col.title}>
              <p className="mb-1 text-xs font-semibold tracking-widest text-slate-400 uppercase dark:text-slate-500">
                {col.title}
              </p>
              <ul className="mt-3 space-y-2.5">
                {col.links.map((link) => (
                  <li key={link.name}>
                    <Link href={link.href}>{link.name}</Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* ── Newsletter ── */}
        <div className="mb-10 rounded-xl border border-slate-200/80 bg-white p-5 shadow-[0_1px_6px_rgba(0,0,0,0.04)] sm:p-6 dark:border-slate-700/60 dark:bg-slate-800/50">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                Stay in the loop
              </p>
              <p className="mt-0.5 text-xs text-slate-400 dark:text-slate-500">
                New grants, platform updates, and research opportunities —
                straight to your inbox.
              </p>
            </div>
            <form
              onSubmit={handleSubscribe}
              className="flex w-full items-end gap-2 sm:w-auto sm:min-w-120"
            >
              <InputField
                type="email"
                placeholder="you@institution.edu"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={isSubmitting}
                radius="lg"
                className="flex-1"
              />
              <Button
                type="submit"
                intent="primary"
                loading={isSubmitting}
                endIcon={
                  !isSubmitting ? (
                    <HiArrowRight className="h-3.5 w-3.5" />
                  ) : undefined
                }
              >
                Subscribe
              </Button>
            </form>
          </div>
        </div>

        {/* ── Bottom bar ── */}
        <div className="flex flex-col items-center justify-between gap-3 border-t border-slate-100 pt-6 sm:flex-row dark:border-slate-800">
          <p className="text-xs text-slate-400 dark:text-slate-500">
            © {new Date().getFullYear()} Research Team. All rights reserved.
          </p>
          <div className="flex items-center gap-4">
            {LEGAL.map((item) => (
              <Link key={item.name} href={item.href} className="text-xs">
                {item.name}
              </Link>
            ))}
          </div>
        </div>
      </div>

      {toast.isOpen && (
        <Toast
          isOpen={toast.isOpen}
          onClose={() => setToast((t) => ({ ...t, isOpen: false }))}
          variant={toast.variant}
          position="bottom-right"
        >
          {toast.message}
        </Toast>
      )}
    </footer>
  );
};

export default Footer;
