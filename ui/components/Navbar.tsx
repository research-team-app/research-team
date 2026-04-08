"use client";

import { useState } from "react";
import { FiSun, FiMoon, FiX, FiMenu, FiChevronRight } from "react-icons/fi";
import { motion, AnimatePresence } from "framer-motion";
import { useThemeStore } from "../store/useThemeStore";
import Logo from "./Logo";
import { useRouter, usePathname } from "next/navigation";
import { useAuthStore } from "../store/useAuthStore";
import ProfileDropdown from "./ProfileDropdown";
import Button from "@/components/ui/Button";
import Link from "@/components/ui/Link";
import { FaFileInvoiceDollar, FaHome, FaUsers } from "react-icons/fa";
import {
  HiMiniUserGroup,
  HiMiniArrowRightStartOnRectangle,
  HiOutlineChatBubbleOvalLeftEllipsis,
} from "react-icons/hi2";

const Navbar = () => {
  const { darkMode, toggleDarkMode } = useThemeStore();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { user } = useAuthStore();
  const router = useRouter();
  const pathname = usePathname();

  // Navbar options
  const MenuOptions = [
    { name: "Home", path: "/", icon: <FaHome /> },
    { name: "Grants", path: "/grants/", icon: <FaFileInvoiceDollar /> },
    { name: "Collaborators", path: "/collaborators/", icon: <FaUsers /> },
    {
      name: "Feed",
      path: "/feed/",
      icon: <HiOutlineChatBubbleOvalLeftEllipsis />,
    },
    {
      name: "Teams",
      path: "/teams/",
      icon: <HiMiniUserGroup />,
    },
  ];

  // Normalize paths (trailing slash) so active state matches on client navigation
  const normalize = (p: string) =>
    p === "/" ? "/" : p.replace(/\/$/, "") || "/";
  const isActive = (path: string) =>
    normalize(pathname ?? "") === normalize(path);

  return (
    <>
      <motion.nav className="fixed top-0 right-0 left-0 z-50 shadow-sm transition-all duration-500 dark:shadow-black/20">
        {/* Full width background */}
        <div className="absolute inset-0 border-b border-slate-200/80 bg-white/95 backdrop-blur-xl dark:border-slate-800/80 dark:bg-slate-950/95" />

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
              <div className="mr-2 inline-flex items-center gap-0.5 rounded-xl border border-slate-200/80 bg-white/60 p-1 lg:mr-4 dark:border-slate-700/60 dark:bg-slate-800/40">
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
                        <div className="bg-primary-600 dark:bg-primary-700 absolute inset-0 rounded-lg shadow-sm transition-all duration-200" />
                      )}
                      <span
                        className={`relative z-10 flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-semibold transition-colors duration-200 ${
                          active
                            ? "text-white"
                            : "text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-700/60 dark:hover:text-slate-100"
                        }`}
                      >
                        <span className="text-base">{item.icon}</span>
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
                className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 shadow-sm transition-colors hover:bg-slate-100 hover:text-slate-900 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700 dark:hover:text-white"
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
                  startIcon={
                    <HiMiniArrowRightStartOnRectangle className="size-5" />
                  }
                  intent="primary"
                  variant="solid"
                  className="rounded-xl px-4 py-2 shadow-sm"
                  onClick={() => router.push("/login")}
                >
                  Login
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
                className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 shadow-sm transition-colors hover:bg-slate-100 hover:text-slate-900 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700 dark:hover:text-white"
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
                className="rounded-xl border border-slate-200 bg-white p-2.5 text-slate-700 shadow-sm transition-colors hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
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
              <div className="relative overflow-hidden rounded-2xl border border-slate-200 shadow-xl dark:border-slate-800 dark:shadow-black/50">
                {/* Background */}
                <div className="absolute inset-0 bg-white/95 backdrop-blur-xl dark:bg-slate-950/95" />

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
                            <div className="bg-primary-600 dark:bg-primary-500 absolute inset-0 shadow-md transition-all duration-200" />
                          )}

                          {/* Hover background */}
                          {!active && (
                            <div className="bg-primary-50 dark:bg-primary-950/60 absolute inset-0 opacity-0 transition-opacity hover:opacity-100" />
                          )}

                          <div className="relative flex items-center justify-between px-4 py-3.5">
                            <span
                              className={`font-medium ${active ? "text-white" : "text-slate-700 dark:text-slate-200"}`}
                            >
                              {item.name}
                            </span>
                            <FiChevronRight
                              className={`h-5 w-5 ${active ? "text-white" : "text-primary-500 dark:text-primary-400"}`}
                            />
                          </div>
                        </motion.span>
                      </Link>
                    );
                  })}

                  {!user && (
                    <Button
                      intent="primary"
                      variant="solid"
                      onClick={() => router.push("/login")}
                    >
                      Login
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Spacer div to prevent content from going under navbar */}
      <div className="h-16 sm:h-20" />
    </>
  );
};

export default Navbar;
