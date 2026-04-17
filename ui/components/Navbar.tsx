"use client";

import { useEffect, useState } from "react";
import {
  FiSun,
  FiMoon,
  FiX,
  FiMenu,
  FiChevronRight,
  FiLogIn,
} from "react-icons/fi";
import { motion, AnimatePresence } from "framer-motion";
import { useThemeStore } from "../store/useThemeStore";
import Logo from "./Logo";
import { useRouter, usePathname } from "next/navigation";
import { useAuthStore } from "../store/useAuthStore";
import ProfileDropdown from "./ProfileDropdown";
import Button from "@/components/ui/Button";
import Link from "@/components/ui/Link";
const Navbar = () => {
  const { darkMode, toggleDarkMode } = useThemeStore();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const { user } = useAuthStore();
  const router = useRouter();
  const pathname = usePathname();

  const MenuOptions = [
    { name: "Home", path: "/" },
    { name: "Grants", path: "/grants/" },
    { name: "Collaborators", path: "/collaborators/" },
    { name: "Feed", path: "/feed/" },
    { name: "Teams", path: "/teams/" },
  ];

  // Normalize paths (trailing slash) so active state matches on client navigation
  const normalize = (p: string) =>
    p === "/" ? "/" : p.replace(/\/$/, "") || "/";
  const isActive = (path: string) =>
    normalize(pathname ?? "") === normalize(path);

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 8);
    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <>
      <motion.nav
        className={`fixed top-0 right-0 left-0 z-50 transition-all duration-300 ${
          isScrolled
            ? "shadow-lg shadow-slate-900/5 dark:shadow-black/20"
            : "shadow-none"
        }`}
      >
        {/* Full width background */}
        <div
          className={`absolute inset-0 transition-all duration-300 ${
            isScrolled
              ? "border-b border-white/50 bg-white/65 shadow-[0_8px_30px_rgba(15,23,42,0.08)] backdrop-blur-2xl dark:border-white/10 dark:bg-slate-950/60 dark:shadow-none"
              : "border-b border-transparent bg-transparent shadow-none backdrop-blur-sm"
          }`}
        />

        {/* Content container */}
        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between sm:h-20">
            {/* Logo */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, type: "spring", stiffness: 100 }}
              className="z-10 shrink-0"
            >
              <Logo />
            </motion.div>

            {/* Desktop Navigation */}
            <div className="hidden flex-1 items-center justify-center px-8 pr-10 lg:flex lg:pr-12">
              <div className="mr-2 inline-flex items-center gap-1 rounded-2xl border border-slate-300/80 bg-white/60 p-1.5 shadow-[0_8px_20px_rgba(15,23,42,0.07)] backdrop-blur-xl lg:mr-4 dark:border-white/10 dark:bg-slate-900/50 dark:shadow-[0_8px_24px_rgba(2,6,23,0.45)]">
                {MenuOptions.map((item) => {
                  const active = isActive(item.path);
                  return (
                    <Link
                      key={item.path}
                      href={item.path}
                      className="group relative block"
                      hoverUnderline={false}
                    >
                      {active && (
                        <div className="absolute inset-0 rounded-xl bg-slate-100/75 backdrop-blur-xl dark:bg-slate-800/60" />
                      )}
                      <span
                        className={`relative z-10 flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-sm font-medium tracking-wide transition-all duration-200 ${
                          active
                            ? "text-primary-700 dark:text-primary-300"
                            : "text-slate-600 hover:bg-white/70 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800/60 dark:hover:text-slate-100"
                        }`}
                      >
                        <span>{item.name}</span>
                      </span>
                    </Link>
                  );
                })}
              </div>
            </div>

            {/* Right side actions */}
            <div className="z-10 hidden shrink-0 items-center gap-3 lg:flex">
              {/* Theme Toggle */}
              <motion.button
                type="button"
                onClick={toggleDarkMode}
                className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-300/80 bg-white/60 text-slate-600 shadow-[0_6px_18px_rgba(15,23,42,0.08)] backdrop-blur-xl transition-colors hover:bg-white/80 hover:text-slate-900 dark:border-white/10 dark:bg-slate-900/60 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white"
                whileTap={{ scale: 0.95 }}
                aria-label={
                  darkMode ? "Switch to light mode" : "Switch to dark mode"
                }
              >
                <AnimatePresence mode="wait">
                  {darkMode ? (
                    <motion.div
                      key="sun"
                      initial={{ opacity: 0, rotate: -15 }}
                      animate={{ opacity: 1, rotate: 0 }}
                      exit={{ opacity: 0, rotate: 15 }}
                      transition={{ duration: 0.2 }}
                    >
                      <FiSun className="h-5 w-5 text-white" />
                    </motion.div>
                  ) : (
                    <motion.div
                      key="moon"
                      initial={{ opacity: 0, rotate: 15 }}
                      animate={{ opacity: 1, rotate: 0 }}
                      exit={{ opacity: 0, rotate: -15 }}
                      transition={{ duration: 0.2 }}
                    >
                      <FiMoon className="h-5 w-5" />
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.button>

              {/* Auth Button */}
              {user ? (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                >
                  <ProfileDropdown />
                </motion.div>
              ) : (
                <Button
                  intent="default"
                  variant="solid"
                  className="group rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm tracking-wide text-slate-800 shadow-[0_8px_20px_rgba(15,23,42,0.08)] transition-all duration-200 hover:-translate-y-0.5 hover:border-slate-400 hover:bg-slate-50 hover:text-slate-900 hover:shadow-[0_12px_24px_rgba(15,23,42,0.12)] dark:border-white/15 dark:bg-slate-900 dark:text-slate-100 dark:hover:border-white/30 dark:hover:bg-slate-800"
                  onClick={() => router.push("/login")}
                >
                  <span className="inline-flex items-center gap-2">
                    <FiLogIn className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5" />
                    <span>Log in</span>
                  </span>
                </Button>
              )}
            </div>

            {/* Mobile controls */}
            <div className="z-10 flex items-center gap-2 lg:hidden">
              {user && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                >
                  <ProfileDropdown />
                </motion.div>
              )}
              <motion.button
                type="button"
                onClick={toggleDarkMode}
                className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-300/80 bg-white/60 text-slate-600 shadow-[0_6px_18px_rgba(15,23,42,0.08)] backdrop-blur-xl transition-colors hover:bg-white/80 hover:text-slate-900 dark:border-white/10 dark:bg-slate-900/60 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white"
                whileTap={{ scale: 0.95 }}
                aria-label={
                  darkMode ? "Switch to light mode" : "Switch to dark mode"
                }
              >
                <AnimatePresence mode="wait">
                  {darkMode ? (
                    <motion.div
                      key="sun"
                      initial={{ opacity: 0, rotate: -15 }}
                      animate={{ opacity: 1, rotate: 0 }}
                      exit={{ opacity: 0, rotate: 15 }}
                      transition={{ duration: 0.2 }}
                    >
                      <FiSun className="h-5 w-5 text-white" />
                    </motion.div>
                  ) : (
                    <motion.div
                      key="moon"
                      initial={{ opacity: 0, rotate: 15 }}
                      animate={{ opacity: 1, rotate: 0 }}
                      exit={{ opacity: 0, rotate: -15 }}
                      transition={{ duration: 0.2 }}
                    >
                      <FiMoon className="h-5 w-5" />
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.button>

              <motion.button
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                className="rounded-xl border border-slate-300/80 bg-white/60 p-2.5 text-slate-700 shadow-[0_6px_18px_rgba(15,23,42,0.08)] backdrop-blur-xl transition-colors hover:bg-white/80 dark:border-white/10 dark:bg-slate-900/60 dark:text-slate-300 dark:hover:bg-slate-800"
                whileTap={{ scale: 0.95 }}
                aria-label="Menu"
              >
                <AnimatePresence mode="wait">
                  {isMenuOpen ? (
                    <motion.div
                      key="close"
                      initial={{ rotate: -90, opacity: 0 }}
                      animate={{ rotate: 0, opacity: 1 }}
                      exit={{ rotate: 90, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                    >
                      <FiX className="h-6 w-6" />
                    </motion.div>
                  ) : (
                    <motion.div
                      key="menu"
                      initial={{ rotate: 90, opacity: 0 }}
                      animate={{ rotate: 0, opacity: 1 }}
                      exit={{ rotate: -90, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                    >
                      <FiMenu className="h-6 w-6" />
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.button>
            </div>
          </div>
        </div>
      </motion.nav>

      {/* Mobile Menu */}
      <AnimatePresence>
        {isMenuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.2 }}
            className="fixed top-18 right-0 left-0 z-40 sm:top-20 lg:hidden"
          >
            <div className="mx-4 mb-4">
              <div className="relative overflow-hidden rounded-2xl border border-slate-300/80 shadow-[0_12px_30px_rgba(15,23,42,0.18)] dark:border-white/10 dark:shadow-black/50">
                {/* Background */}
                <div className="absolute inset-0 bg-white/70 backdrop-blur-2xl dark:bg-slate-950/70" />

                {/* Menu items */}
                <div className="relative space-y-1 p-3">
                  {MenuOptions.map((item, index) => {
                    const active = isActive(item.path);
                    return (
                      <Link
                        key={item.name}
                        href={item.path}
                        className="relative block overflow-hidden rounded-xl"
                        hoverUnderline={false}
                        onClick={() => setIsMenuOpen(false)}
                      >
                        <motion.span
                          className="block"
                          initial={{ x: -30, opacity: 0 }}
                          animate={{ x: 0, opacity: 1 }}
                          exit={{ x: -30, opacity: 0 }}
                          transition={{ delay: index * 0.05 }}
                          whileTap={{ scale: 0.98 }}
                        >
                          {/* Active background */}
                          {active && (
                            <div className="absolute inset-0 rounded-xl bg-slate-100/75 backdrop-blur-xl dark:bg-slate-800/60" />
                          )}

                          {/* Hover background */}
                          {!active && (
                            <div className="absolute inset-0 rounded-xl bg-white/60 opacity-0 transition-opacity hover:opacity-100 dark:bg-slate-800/60" />
                          )}

                          <div className="relative flex items-center justify-between px-4 py-3.5">
                            <span
                              className={`font-medium ${active ? "text-primary-700 dark:text-primary-300" : "text-slate-700 dark:text-slate-200"}`}
                            >
                              {item.name}
                            </span>
                            <FiChevronRight
                              className={`h-5 w-5 ${active ? "text-primary-600 dark:text-primary-300" : "text-slate-400 dark:text-slate-500"}`}
                            />
                          </div>
                        </motion.span>
                      </Link>
                    );
                  })}

                  {!user && (
                    <Button
                      intent="default"
                      variant="solid"
                      className="mt-2 w-full rounded-xl border border-slate-300 bg-white py-2.5 text-sm tracking-wide text-slate-800 shadow-[0_8px_20px_rgba(15,23,42,0.08)] hover:border-slate-400 hover:bg-slate-50 hover:text-slate-900 dark:border-white/15 dark:bg-slate-900 dark:text-slate-100 dark:hover:border-white/30 dark:hover:bg-slate-800"
                      onClick={() => router.push("/login")}
                    >
                      <span className="inline-flex items-center justify-center gap-2">
                        <FiLogIn className="h-4 w-4" />
                        <span>Log in</span>
                      </span>
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Spacer div to prevent content from going under navbar */}
      <div className="bg-background h-16 sm:h-20" />
    </>
  );
};

export default Navbar;
