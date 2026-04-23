"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { FiSun, FiMoon, FiX, FiMenu, FiLogIn } from "react-icons/fi";
import { AnimatePresence, motion } from "framer-motion";
import { useThemeStore } from "../store/useThemeStore";
import Logo from "./Logo";
import { useRouter, usePathname } from "next/navigation";
import { useAuthStore } from "../store/useAuthStore";
import ProfileDropdown from "./ProfileDropdown";
import Button from "@/components/ui/Button";
import IconButton from "@/components/ui/IconButton";
import Link from "@/components/ui/Link";

const MENU_OPTIONS = [
  { name: "Home", path: "/" },
  { name: "Grants", path: "/grants/" },
  { name: "Collaborators", path: "/collaborators/" },
  { name: "Feed", path: "/feed/" },
  { name: "Teams", path: "/teams/" },
];

const normalize = (p: string) =>
  p === "/" ? "/" : p.replace(/\/$/, "") || "/";

const useIsomorphicLayoutEffect =
  typeof window !== "undefined" ? useLayoutEffect : useEffect;

const Navbar = () => {
  const { darkMode, toggleDarkMode } = useThemeStore();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const { user } = useAuthStore();
  const router = useRouter();
  const pathname = usePathname();

  const listRef = useRef<HTMLUListElement>(null);
  const itemRefs = useRef<Record<string, HTMLLIElement | null>>({});
  const [pillStyle, setPillStyle] = useState<{
    left: number;
    width: number;
    visible: boolean;
  }>({ left: 0, width: 0, visible: false });

  const isActive = (path: string) =>
    normalize(pathname ?? "") === normalize(path);

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 4);
    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const activeItem = MENU_OPTIONS.find((item) => isActive(item.path)) ?? null;

  useIsomorphicLayoutEffect(() => {
    if (!activeItem || !listRef.current) {
      setPillStyle((prev) => ({ ...prev, visible: false }));
      return;
    }
    const el = itemRefs.current[activeItem.path];
    if (!el) return;
    const parentRect = listRef.current.getBoundingClientRect();
    const rect = el.getBoundingClientRect();
    setPillStyle({
      left: rect.left - parentRect.left,
      width: rect.width,
      visible: true,
    });
  }, [activeItem?.path, pathname]);

  const themeToggle = (
    <IconButton
      label={darkMode ? "Switch to light mode" : "Switch to dark mode"}
      onClick={toggleDarkMode}
      variant="ghost"
      size="md"
      className="rounded-full border dark:border-gray-600"
    >
      {darkMode ? <FiSun /> : <FiMoon />}
    </IconButton>
  );

  return (
    <>
      <nav
        className={`fixed top-0 right-0 left-0 z-50 transition-all duration-300 ${
          isScrolled
            ? "border-b border-slate-200/70 bg-white/70 shadow-[0_1px_0_0_rgba(15,23,42,0.04),0_4px_20px_-6px_rgba(15,23,42,0.08)] backdrop-blur-xl backdrop-saturate-150 dark:border-slate-800/60 dark:bg-slate-950/70 dark:shadow-[0_1px_0_0_rgba(255,255,255,0.04),0_4px_20px_-6px_rgba(0,0,0,0.5)]"
            : "border-b border-transparent bg-white/40 backdrop-blur-md dark:bg-slate-950"
        }`}
      >
        {/* Subtle top-edge gradient accent */}
        <div
          aria-hidden
          className="via-primary-500/40 pointer-events-none absolute inset-x-0 top-0 h-px bg-linear-to-r from-transparent to-transparent opacity-60"
        />

        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div
            className={`flex items-center justify-between transition-[height] duration-300 ${
              isScrolled ? "h-14" : "h-16"
            }`}
          >
            <div className="flex shrink-0 items-center">
              <Logo />
            </div>

            {/* Desktop nav */}
            <div className="hidden flex-1 items-center justify-center lg:flex">
              <ul
                ref={listRef}
                className="relative flex items-center gap-1 rounded-full border border-slate-200/60 bg-slate-50/50 p-1 shadow-sm backdrop-blur-sm dark:border-slate-800/60 dark:bg-slate-900/40"
              >
                {/* Sliding active pill */}
                <AnimatePresence>
                  {pillStyle.visible && (
                    <motion.span
                      aria-hidden
                      layout
                      initial={false}
                      animate={{
                        left: pillStyle.left,
                        width: pillStyle.width,
                      }}
                      transition={{
                        type: "spring",
                        stiffness: 400,
                        damping: 32,
                        mass: 0.6,
                      }}
                      className="absolute top-1 bottom-1 z-0 rounded-full bg-white shadow-[0_1px_2px_rgba(15,23,42,0.08),0_4px_12px_-2px_rgba(15,23,42,0.06)] ring-1 ring-slate-200/70 dark:bg-slate-800 dark:shadow-[0_1px_2px_rgba(0,0,0,0.4)] dark:ring-slate-700/60"
                    />
                  )}
                </AnimatePresence>

                {MENU_OPTIONS.map((item) => {
                  const active = isActive(item.path);
                  return (
                    <li
                      key={item.path}
                      ref={(el) => {
                        itemRefs.current[item.path] = el;
                      }}
                      className="relative z-10"
                    >
                      <Link
                        href={item.path}
                        className="block"
                        hoverUnderline={false}
                      >
                        <span
                          className={`relative inline-flex items-center rounded-full px-4 py-1.5 text-sm font-medium tracking-tight transition-colors duration-200 ${
                            active
                              ? "text-primary-700 dark:text-primary-300"
                              : "text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
                          }`}
                        >
                          {item.name}
                        </span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>

            {/* Desktop actions */}
            <div className="hidden shrink-0 items-center gap-2 lg:flex">
              {themeToggle}
              {user ? (
                <ProfileDropdown />
              ) : (
                <Button
                  intent="primary"
                  variant="solid"
                  size="sm"
                  startIcon={<FiLogIn className="h-4 w-4" />}
                  onClick={() => router.push("/login")}
                  className="rounded-full shadow-sm"
                >
                  Log in
                </Button>
              )}
            </div>

            {/* Mobile controls */}
            <div className="flex items-center gap-1 lg:hidden">
              {user && <ProfileDropdown />}
              {themeToggle}
              <IconButton
                label={isMenuOpen ? "Close menu" : "Open menu"}
                onClick={() => setIsMenuOpen((prev) => !prev)}
                aria-expanded={isMenuOpen}
                variant="ghost"
                size="md"
              >
                <AnimatePresence mode="wait" initial={false}>
                  <motion.span
                    key={isMenuOpen ? "close" : "open"}
                    initial={{ rotate: -90, opacity: 0 }}
                    animate={{ rotate: 0, opacity: 1 }}
                    exit={{ rotate: 90, opacity: 0 }}
                    transition={{ duration: 0.15 }}
                    className="inline-flex"
                  >
                    {isMenuOpen ? <FiX /> : <FiMenu />}
                  </motion.span>
                </AnimatePresence>
              </IconButton>
            </div>
          </div>
        </div>

        {/* Mobile menu */}
        <AnimatePresence>
          {isMenuOpen && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
              className="border-t border-slate-200/70 bg-white/95 backdrop-blur-xl lg:hidden dark:border-slate-800/70 dark:bg-slate-950/95"
            >
              <ul className="mx-auto max-w-7xl space-y-1 px-3 py-3 sm:px-4">
                {MENU_OPTIONS.map((item, i) => {
                  const active = isActive(item.path);
                  return (
                    <motion.li
                      key={item.path}
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.03, duration: 0.2 }}
                    >
                      <Link
                        href={item.path}
                        hoverUnderline={false}
                        onClick={() => setIsMenuOpen(false)}
                        className="block"
                      >
                        <span
                          className={`block rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                            active
                              ? "from-primary-50 to-primary-50/50 text-primary-700 dark:from-primary-950/50 dark:to-primary-950/20 dark:text-primary-300 bg-linear-to-r"
                              : "text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white"
                          }`}
                        >
                          {item.name}
                        </span>
                      </Link>
                    </motion.li>
                  );
                })}
                {!user && (
                  <li className="pt-2">
                    <Button
                      intent="primary"
                      fullWidth
                      startIcon={<FiLogIn className="h-4 w-4" />}
                      onClick={() => {
                        setIsMenuOpen(false);
                        router.push("/login");
                      }}
                      className="rounded-full"
                    >
                      Log in
                    </Button>
                  </li>
                )}
              </ul>
            </motion.div>
          )}
        </AnimatePresence>
      </nav>

      {/* Spacer */}
      <div className="h-16" />
    </>
  );
};

export default Navbar;
