"use client";

import { useCallback, useEffect, useState } from "react";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import {
  UserCircleIcon,
  UserGroupIcon,
  BookmarkIcon,
  ChatBubbleLeftRightIcon,
  ArrowRightStartOnRectangleIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  Cog6ToothIcon,
  EyeSlashIcon,
  TrashIcon,
  BellAlertIcon,
  ArrowDownTrayIcon,
} from "@heroicons/react/24/outline";
import Link from "next/link";
import { useAuthStore } from "../store/useAuthStore";
import { useWishlistStore } from "../store/useWishListStore";
import clsx from "clsx";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { API_URL } from "@/data/global";
import { getAuthHeaders } from "@/lib/apiAuth";
import axios from "axios";
import Button from "@/components/ui/Button";
import Avatar from "@/components/Avatar";
import { useGroups } from "@/store/useGroupStore";

export default function ProfileDropdown() {
  const { signOut, user } = useAuthStore();
  const { wishlistIds, fetchWishlistIds } = useWishlistStore();
  const { data: myGroups = [] } = useGroups(true);
  const [open, setOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [profileStatus, setProfileStatus] = useState<"public" | "private">(
    "public"
  );
  const [settingsLoading, setSettingsLoading] = useState(false);
  const [privateSaving, setPrivateSaving] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [exportLoading, setExportLoading] = useState(false);
  const [settingsError, setSettingsError] = useState<string | null>(null);
  const [unreadCount, setUnreadCount] = useState(0);

  const loadSettings = useCallback(async () => {
    if (!user?.id) return;
    setSettingsLoading(true);
    setSettingsError(null);
    try {
      const { data } = await axios.get<{ status?: string }>(
        `${API_URL}/users/${user.id}`
      );
      setProfileStatus(data?.status === "private" ? "private" : "public");
    } catch {
      setSettingsError("Could not load settings.");
      setProfileStatus("public");
    } finally {
      setSettingsLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    if (user?.id) fetchWishlistIds(user.id);
  }, [user?.id, fetchWishlistIds]);

  useEffect(() => {
    if (settingsOpen && user?.id) loadSettings();
  }, [settingsOpen, user?.id, loadSettings]);

  const loadUnreadCount = useCallback(async () => {
    if (!user?.id) {
      setUnreadCount(0);
      return;
    }
    try {
      const headers = await getAuthHeaders();
      const { data } = await axios.get<{ unread_count?: number }>(
        `${API_URL}/messages/unread-count`,
        { headers }
      );
      setUnreadCount(Number(data?.unread_count ?? 0));
    } catch {
      setUnreadCount(0);
    }
  }, [user?.id]);

  useEffect(() => {
    if (user?.id) {
      loadUnreadCount();
    }
  }, [user?.id, loadUnreadCount]);

  const handlePrivateToggle = async (next: boolean) => {
    if (!user?.id) return;
    setPrivateSaving(true);
    setSettingsError(null);
    try {
      const headers = await getAuthHeaders();
      await axios.put(
        `${API_URL}/users/${user.id}`,
        { status: next ? "private" : "public" },
        { headers }
      );
      setProfileStatus(next ? "private" : "public");
    } catch {
      setSettingsError("Could not update privacy.");
    } finally {
      setPrivateSaving(false);
    }
  };

  const handleExportData = async () => {
    if (!user?.id || exportLoading) return;
    setExportLoading(true);
    try {
      const headers = await getAuthHeaders();
      const { data } = await axios.get(`${API_URL}/users/${user.id}/export`, {
        headers,
      });
      const blob = new Blob([JSON.stringify(data, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `researchteam-export-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      // silently ignore — user can retry
    } finally {
      setExportLoading(false);
    }
  };

  const handleDeleteProfile = async () => {
    if (!user?.id) return;
    setDeleteLoading(true);
    try {
      const headers = await getAuthHeaders();
      await axios.delete(`${API_URL}/users/${user.id}`, { headers });
      setDeleteConfirmOpen(false);
      setSettingsOpen(false);
      await signOut();
      window.location.href = "/";
    } catch {
      setSettingsError("Could not delete profile.");
    } finally {
      setDeleteLoading(false);
    }
  };

  const displayName =
    user?.attributes?.given_name && user?.attributes?.family_name
      ? `${user.attributes.given_name} ${user.attributes.family_name}`
      : (user?.username ?? "Account");
  const email = user?.attributes?.email ?? "";

  return (
    <>
      <DropdownMenu.Root open={open} onOpenChange={setOpen}>
        <DropdownMenu.Trigger asChild>
          <button
            type="button"
            className={clsx(
              "group flex items-center gap-2 rounded-full p-1 pr-2 transition-all",
              "ring-1 ring-slate-200/80 hover:bg-slate-50 hover:ring-slate-300",
              "dark:ring-slate-600 dark:hover:bg-slate-800/80 dark:hover:ring-slate-500",
              "focus-visible:ring-primary-500 focus-visible:ring-2 focus-visible:outline-none"
            )}
            aria-label="Account menu"
          >
            <Avatar
              userId={user?.id}
              name={displayName}
              size={40}
              className="shadow-sm ring-2 ring-white dark:ring-slate-900"
              fallbackClassName="theme-slate-avatar"
              textClassName="text-sm font-bold"
            />
            <ChevronDownIcon
              className={clsx(
                "hidden h-4 w-4 text-slate-400 transition-transform duration-200 sm:block dark:text-slate-500",
                open && "rotate-180"
              )}
            />
          </button>
        </DropdownMenu.Trigger>

        <DropdownMenu.Portal>
          <DropdownMenu.Content
            align="end"
            sideOffset={10}
            className={clsx(
              "z-50 w-[min(100vw-2rem,20rem)] overflow-hidden rounded-xl shadow-xl",
              "border border-slate-200/90 bg-white",
              "dark:border-slate-700 dark:bg-slate-900",
              "animate-in fade-in-0 zoom-in-95 slide-in-from-top-2 duration-200"
            )}
          >
            <div
              className={clsx(
                "border-b border-slate-100 bg-linear-to-b from-slate-50/80 to-white px-4 py-3",
                "dark:border-slate-800 dark:from-slate-800/50 dark:to-slate-900"
              )}
            >
              <p className="truncate text-sm font-semibold text-slate-900 dark:text-white">
                {displayName}
              </p>
              {email ? (
                <p className="mt-0.5 truncate text-xs text-slate-500 dark:text-slate-400">
                  {email}
                </p>
              ) : null}
            </div>

            <div className="px-2 py-2">
              <DropdownMenu.Item asChild>
                <Link
                  href="/saved-grants/"
                  className={clsx(
                    "flex items-center justify-between rounded-lg px-3 py-2.5 text-sm",
                    "text-slate-800 outline-none",
                    "hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800",
                    "focus:bg-slate-100 dark:focus:bg-slate-800"
                  )}
                  onClick={() => setOpen(false)}
                >
                  <span className="flex items-center gap-2">
                    <BookmarkIcon className="h-4 w-4 shrink-0 text-amber-500 dark:text-amber-400/90" />
                    Saved grants
                    {wishlistIds.length > 0 && (
                      <span className="rounded-full bg-slate-200 px-2 py-0.5 text-xs font-medium text-slate-600 dark:bg-slate-700 dark:text-slate-300">
                        {wishlistIds.length}
                      </span>
                    )}
                  </span>
                  <ChevronRightIcon className="h-4 w-4 text-slate-400 dark:text-slate-500" />
                </Link>
              </DropdownMenu.Item>
              {wishlistIds.length === 0 && (
                <p className="px-3 pb-1 text-xs text-slate-500 dark:text-slate-400">
                  Save grants from any card to see them here.
                </p>
              )}
            </div>

            <DropdownMenu.Separator className="h-px bg-slate-100 dark:bg-slate-800" />

            <div className="px-2 py-2">
              <DropdownMenu.Item asChild>
                <Link
                  href="/teams/"
                  className={clsx(
                    "flex items-center justify-between rounded-lg px-3 py-2.5 text-sm",
                    "text-slate-800 outline-none",
                    "hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800",
                    "focus:bg-slate-100 dark:focus:bg-slate-800"
                  )}
                  onClick={() => setOpen(false)}
                >
                  <span className="flex items-center gap-2">
                    <UserGroupIcon className="text-primary-500 dark:text-primary-400 h-4 w-4 shrink-0" />
                    Teams
                    <span className="rounded-full bg-slate-200 px-2 py-0.5 text-xs font-medium text-slate-600 dark:bg-slate-700 dark:text-slate-300">
                      {myGroups.filter((g) => g.status === "active").length}
                    </span>
                  </span>
                  <ChevronRightIcon className="h-4 w-4 text-slate-400 dark:text-slate-500" />
                </Link>
              </DropdownMenu.Item>

              {myGroups.filter((g) => g.status === "active").length > 0 ? (
                <div className="mt-1 space-y-1 px-3 pb-1">
                  {myGroups
                    .filter((g) => g.status === "active")
                    .slice(0, 3)
                    .map((group) => (
                      <Link
                        key={group.id}
                        href="/teams/"
                        className="block truncate text-xs text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200"
                        onClick={() => setOpen(false)}
                      >
                        • {group.name}
                      </Link>
                    ))}
                </div>
              ) : (
                <p className="px-3 pb-1 text-xs text-slate-500 dark:text-slate-400">
                  Join or create a team to collaborate faster.
                </p>
              )}
            </div>

            <DropdownMenu.Separator className="h-px bg-slate-100 dark:bg-slate-800" />

            <div className="p-1.5">
              <DropdownMenu.Item asChild>
                <button
                  type="button"
                  onClick={() => {
                    setOpen(false);
                    window.dispatchEvent(new CustomEvent("open-chat-dock"));
                  }}
                  className={clsx(
                    "flex w-full cursor-pointer items-center justify-between rounded-lg px-3 py-2.5 text-sm",
                    "text-slate-800 outline-none",
                    "hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800",
                    "data-highlighted:bg-slate-100 dark:data-highlighted:bg-slate-800"
                  )}
                >
                  <span className="flex items-center gap-3">
                    <ChatBubbleLeftRightIcon className="h-5 w-5 text-slate-500 dark:text-slate-400" />
                    <span>Messages</span>
                    {unreadCount > 0 && (
                      <span className="bg-primary-600 rounded-full px-2 py-0.5 text-[11px] font-semibold text-white">
                        {unreadCount}
                      </span>
                    )}
                  </span>
                  <ChevronRightIcon className="h-4 w-4 text-slate-400 dark:text-slate-500" />
                </button>
              </DropdownMenu.Item>

              <DropdownMenu.Item asChild>
                <Link
                  href={
                    user?.id
                      ? `/profile/?id=${encodeURIComponent(user.id)}`
                      : "/profile/"
                  }
                  className={clsx(
                    "flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2.5 text-sm",
                    "text-slate-800 outline-none",
                    "hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800",
                    "data-highlighted:bg-slate-100 dark:data-highlighted:bg-slate-800"
                  )}
                  onClick={() => setOpen(false)}
                >
                  <UserCircleIcon className="h-5 w-5 text-slate-500 dark:text-slate-400" />
                  <span>Your profile</span>
                </Link>
              </DropdownMenu.Item>

              <DropdownMenu.Item
                onSelect={(e) => {
                  e.preventDefault();
                  setOpen(false);
                  setSettingsOpen(true);
                }}
                className={clsx(
                  "flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2.5 text-sm",
                  "text-slate-800 outline-none",
                  "hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800",
                  "data-highlighted:bg-slate-100 dark:data-highlighted:bg-slate-800"
                )}
              >
                <Cog6ToothIcon className="h-5 w-5 text-slate-500 dark:text-slate-400" />
                <span>Account settings</span>
              </DropdownMenu.Item>

              <DropdownMenu.Item
                onSelect={async () => {
                  setOpen(false);
                  await signOut();
                  window.location.href = "/";
                }}
                className={clsx(
                  "flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2.5 text-sm",
                  "text-red-600 outline-none",
                  "hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/30",
                  "data-highlighted:bg-red-50 dark:data-highlighted:bg-red-950/30"
                )}
              >
                <ArrowRightStartOnRectangleIcon className="h-5 w-5" />
                <span>Sign out</span>
              </DropdownMenu.Item>
            </div>
          </DropdownMenu.Content>
        </DropdownMenu.Portal>
      </DropdownMenu.Root>

      {/* Account settings dialog */}
      <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
        <DialogContent className="max-h-[85vh] max-w-md overflow-y-auto border-slate-200 bg-white sm:max-w-md dark:border-slate-700 dark:bg-slate-900">
          <DialogHeader>
            <DialogTitle className="text-slate-900 dark:text-white">
              Account settings
            </DialogTitle>
            <DialogDescription className="text-slate-600 dark:text-slate-400">
              Manage privacy and account options. More controls will appear here
              over time.
            </DialogDescription>
          </DialogHeader>

          {settingsError && (
            <p className="text-sm text-red-600 dark:text-red-400">
              {settingsError}
            </p>
          )}

          <div className="space-y-1">
            {/* Privacy */}
            <div className="rounded-lg border border-slate-200 p-4 dark:border-slate-700">
              <div className="flex items-start gap-3">
                <EyeSlashIcon className="mt-0.5 h-5 w-5 shrink-0 text-slate-500 dark:text-slate-400" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-slate-900 dark:text-white">
                    Private profile
                  </p>
                  <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                    Hide your profile from the Collaborators directory and
                    search.
                  </p>
                  {settingsLoading ? (
                    <p className="mt-2 text-xs text-slate-400">Loading…</p>
                  ) : (
                    <label className="mt-3 flex cursor-pointer items-center gap-2">
                      <input
                        type="checkbox"
                        checked={profileStatus === "private"}
                        disabled={privateSaving}
                        onChange={(e) => handlePrivateToggle(e.target.checked)}
                        className="text-primary-600 focus:ring-primary-500 h-4 w-4 rounded border-slate-300 dark:border-slate-600 dark:bg-slate-800"
                      />
                      <span className="text-sm text-slate-700 dark:text-slate-300">
                        {privateSaving ? "Saving…" : "Make my profile private"}
                      </span>
                    </label>
                  )}
                </div>
              </div>
            </div>

            {/* Placeholders for future options */}
            <div className="rounded-lg border border-dashed border-slate-200 p-4 opacity-70 dark:border-slate-700">
              <div className="flex items-start gap-3">
                <BellAlertIcon className="mt-0.5 h-5 w-5 shrink-0 text-slate-400" />
                <div>
                  <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
                    Email notifications
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-500">
                    Coming soon
                  </p>
                </div>
              </div>
            </div>
            <div className="rounded-lg border border-slate-200 p-4 dark:border-slate-700">
              <div className="flex items-start gap-3">
                <ArrowDownTrayIcon className="mt-0.5 h-5 w-5 shrink-0 text-slate-500 dark:text-slate-400" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-slate-900 dark:text-white">
                    Export your data
                  </p>
                  <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                    Download your profile, messages, feed posts, and saved
                    grants as a JSON file.
                  </p>
                  <Button
                    size="xs"
                    variant="outline"
                    className="mt-3"
                    disabled={exportLoading}
                    onClick={handleExportData}
                    startIcon={<ArrowDownTrayIcon className="size-3.5" />}
                  >
                    {exportLoading ? "Preparing…" : "Download"}
                  </Button>
                </div>
              </div>
            </div>

            {/* Danger zone */}
            <div className="rounded-lg border border-red-200 bg-red-50/50 p-4 dark:border-red-900/40 dark:bg-red-950/20">
              <div className="flex items-start gap-3">
                <TrashIcon className="mt-0.5 h-5 w-5 shrink-0 text-red-600 dark:text-red-400" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-red-800 dark:text-red-200">
                    Delete profile
                  </p>
                  <p className="mt-0.5 text-xs text-red-700/90 dark:text-red-300/90">
                    Permanently remove your profile. You can register again
                    later.
                  </p>
                  <Button
                    type="button"
                    intent="danger"
                    variant="outline"
                    size="sm"
                    className="mt-3"
                    onClick={() => setDeleteConfirmOpen(true)}
                  >
                    Delete my profile
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <Dialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <DialogContent className="max-w-sm border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900">
          <DialogHeader>
            <DialogTitle className="text-slate-900 dark:text-white">
              Delete profile?
            </DialogTitle>
            <DialogDescription className="text-slate-600 dark:text-slate-400">
              This cannot be undone. Your saved grants and profile data will be
              removed.
            </DialogDescription>
          </DialogHeader>
          <div className="flex gap-3 pt-2">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => setDeleteConfirmOpen(false)}
              disabled={deleteLoading}
            >
              Cancel
            </Button>
            <Button
              intent="danger"
              variant="solid"
              className="flex-1"
              onClick={handleDeleteProfile}
              disabled={deleteLoading}
            >
              {deleteLoading ? "Deleting…" : "Delete"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
