"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react";
import clsx from "clsx";
import axios from "axios";
import { API_URL } from "@/data/global";
import { getAuthHeaders } from "@/lib/apiAuth";
import { useAuthStore } from "@/store/useAuthStore";
import Button from "@/components/ui/Button";
import TextArea from "@/components/ui/TextArea";
import AttachmentChip from "@/components/AttachmentChip";
import AttachmentPickerButton from "@/components/AttachmentPickerButton";
import Link from "next/link";
import {
  ChatBubbleLeftRightIcon,
  XMarkIcon,
  ArrowLeftIcon,
  ArrowsPointingOutIcon,
  ArrowsPointingInIcon,
  MinusSmallIcon,
  PaperAirplaneIcon,
} from "@heroicons/react/24/outline";
import Avatar from "@/components/Avatar";

const CHAT_DOCK_POS_KEY = "chat-dock-position-v1";
const LAUNCHER_WIDTH = 168;
const LAUNCHER_HEIGHT = 52;
const EDGE_GUTTER = 12;

type ChatMessage = {
  id: string;
  content: string;
  attachment?: {
    file_name: string;
    content_type: string;
    size_bytes: number;
    download_url: string;
  } | null;
  is_read: boolean;
  created_at?: string;
  sender_id?: string;
  recipient_id?: string;
};

type ConversationItem = {
  user: {
    id?: string;
    name?: string;
    title?: string;
  };
  last_message?: {
    id?: string;
    sender_id?: string;
    recipient_id?: string;
    content?: string;
    is_read?: boolean;
    created_at?: string;
  };
  unread_count?: number;
};

function toEpochMs(dateIso?: string): number {
  if (!dateIso) return 0;
  const ms = Date.parse(dateIso);
  return Number.isFinite(ms) ? ms : 0;
}

function formatConversationTime(dateIso?: string): string {
  const ms = toEpochMs(dateIso);
  if (!ms) return "";
  const d = new Date(ms);
  const now = new Date();
  const sameDay =
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate();
  if (sameDay) {
    return d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  }
  const diffDays = Math.floor((now.getTime() - ms) / 86400000);
  if (diffDays < 7) {
    return d.toLocaleDateString([], { weekday: "short" });
  }
  return d.toLocaleDateString([], { month: "short", day: "numeric" });
}

function formatWhen(dateIso?: string): string {
  if (!dateIso) return "";
  return new Date(dateIso).toLocaleString();
}

export default function ChatDock() {
  const { user } = useAuthStore();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const [conversationItems, setConversationItems] = useState<
    ConversationItem[]
  >([]);
  const [activePeerId, setActivePeerId] = useState<string | null>(null);
  const [threadItems, setThreadItems] = useState<ChatMessage[]>([]);
  const [threadDraft, setThreadDraft] = useState("");
  const [threadFile, setThreadFile] = useState<File | null>(null);
  const [threadSending, setThreadSending] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [activePeerNameHint, setActivePeerNameHint] = useState<string>("");
  const [isDesktop, setIsDesktop] = useState(false);
  const [dockPos, setDockPos] = useState<{ right: number; bottom: number }>({
    right: 20,
    bottom: 20,
  });
  const [, setIsDraggingDock] = useState(false);
  const threadScrollRef = useRef<HTMLDivElement | null>(null);
  const dragStateRef = useRef<{
    active: boolean;
    moved: boolean;
    startX: number;
    startY: number;
    startRight: number;
    startBottom: number;
    currentRight: number;
    currentBottom: number;
  }>({
    active: false,
    moved: false,
    startX: 0,
    startY: 0,
    startRight: 20,
    startBottom: 20,
    currentRight: 20,
    currentBottom: 20,
  });

  const activeConversation = useMemo(
    () =>
      conversationItems.find((c) => String(c.user?.id ?? "") === activePeerId),
    [conversationItems, activePeerId]
  );

  const sortedConversations = useMemo(() => {
    return [...conversationItems].sort((a, b) => {
      const aUnread = Number(a.unread_count ?? 0) > 0;
      const bUnread = Number(b.unread_count ?? 0) > 0;
      if (aUnread !== bUnread) return aUnread ? -1 : 1;
      return (
        toEpochMs(b.last_message?.created_at) -
        toEpochMs(a.last_message?.created_at)
      );
    });
  }, [conversationItems]);

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

  const loadConversations = useCallback(async () => {
    if (!user?.id) {
      setConversationItems([]);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const headers = await getAuthHeaders();
      const { data } = await axios.get<{ items?: ConversationItem[] }>(
        `${API_URL}/messages/conversations?limit=80&offset=0`,
        { headers }
      );
      const items = Array.isArray(data?.items) ? data.items : [];
      setConversationItems(items);
      await loadUnreadCount();
    } catch {
      setError("Could not load conversations.");
      setConversationItems([]);
    } finally {
      setLoading(false);
    }
  }, [user?.id, loadUnreadCount]);

  const loadThread = useCallback(
    async (otherUserId: string) => {
      if (!user?.id || !otherUserId) {
        setThreadItems([]);
        return;
      }
      try {
        const headers = await getAuthHeaders();
        const { data } = await axios.get<{ items?: ChatMessage[] }>(
          `${API_URL}/messages/thread/${encodeURIComponent(otherUserId)}?limit=120`,
          { headers }
        );
        setThreadItems(Array.isArray(data?.items) ? data.items : []);
        await axios.patch(
          `${API_URL}/messages/thread/${encodeURIComponent(otherUserId)}/read`,
          {},
          { headers }
        );
        await loadUnreadCount();
      } catch {
        setError("Could not load conversation.");
      }
    },
    [user?.id, loadUnreadCount]
  );

  const sendThreadMessage = async () => {
    const recipientId = (activePeerId || "").trim();
    const content = threadDraft.trim();
    if ((!content && !threadFile) || !recipientId) return;
    setThreadSending(true);
    setError(null);
    try {
      const headers = await getAuthHeaders();
      const hasFile = threadFile instanceof File;
      const body = hasFile
        ? (() => {
            const form = new FormData();
            form.append("recipient_id", recipientId);
            form.append("content", content);
            form.append("file", threadFile);
            return form;
          })()
        : { recipient_id: recipientId, content };
      await axios.post(`${API_URL}/messages`, body, {
        headers: hasFile
          ? headers
          : { ...headers, "Content-Type": "application/json" },
      });
      setThreadDraft("");
      setThreadFile(null);
      await Promise.all([
        loadConversations(),
        loadThread(recipientId),
        loadUnreadCount(),
      ]);
    } catch {
      setError("Could not send message.");
    } finally {
      setThreadSending(false);
    }
  };

  useEffect(() => {
    if (!user?.id) return;
    loadUnreadCount();
  }, [user?.id, loadUnreadCount]);

  useEffect(() => {
    if (open) loadConversations();
  }, [open, loadConversations]);

  useEffect(() => {
    if (open && activePeerId) {
      loadThread(activePeerId);
    }
  }, [open, activePeerId, loadThread]);

  useEffect(() => {
    if (!open) return;
    const el = threadScrollRef.current;
    if (!el) return;
    requestAnimationFrame(() => {
      el.scrollTop = el.scrollHeight;
    });
  }, [threadItems, open, activePeerId]);

  useEffect(() => {
    const handler = (event: Event) => {
      const custom = event as CustomEvent<{
        otherUserId?: string;
        name?: string;
      }>;
      const otherUserId = String(custom?.detail?.otherUserId ?? "").trim();
      const name = String(custom?.detail?.name ?? "").trim();
      if (otherUserId) {
        setActivePeerId(otherUserId);
      }
      if (name) {
        setActivePeerNameHint(name);
      }
      setIsFullscreen(false);
      setOpen(true);
    };
    window.addEventListener("open-chat-dock", handler as EventListener);
    return () => {
      window.removeEventListener("open-chat-dock", handler as EventListener);
    };
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const update = () => {
      setIsDesktop(window.innerWidth >= 640);
    };
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const raw = window.localStorage.getItem(CHAT_DOCK_POS_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as { right?: number; bottom?: number };
      const right =
        typeof parsed.right === "number" && Number.isFinite(parsed.right)
          ? parsed.right
          : 20;
      const bottom =
        typeof parsed.bottom === "number" && Number.isFinite(parsed.bottom)
          ? parsed.bottom
          : 20;
      setDockPos({ right, bottom });
    } catch {
      // ignore malformed local storage values
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined" || !isDesktop) return;
    const maxRight = Math.max(
      EDGE_GUTTER,
      window.innerWidth - LAUNCHER_WIDTH - EDGE_GUTTER
    );
    const maxBottom = Math.max(
      EDGE_GUTTER,
      window.innerHeight - LAUNCHER_HEIGHT - EDGE_GUTTER
    );
    setDockPos((prev) => ({
      right: Math.min(maxRight, Math.max(EDGE_GUTTER, prev.right)),
      bottom: Math.min(maxBottom, Math.max(EDGE_GUTTER, prev.bottom)),
    }));
  }, [isDesktop]);

  const startDragDock = (e: ReactPointerEvent<HTMLButtonElement>) => {
    if (!isDesktop) return;
    if (e.pointerType === "mouse" && e.button !== 0) return;
    dragStateRef.current = {
      active: true,
      moved: false,
      startX: e.clientX,
      startY: e.clientY,
      startRight: dockPos.right,
      startBottom: dockPos.bottom,
      currentRight: dockPos.right,
      currentBottom: dockPos.bottom,
    };
    setIsDraggingDock(true);
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };

  const moveDragDock = (e: ReactPointerEvent<HTMLButtonElement>) => {
    const drag = dragStateRef.current;
    if (!drag.active || !isDesktop) return;
    const dx = e.clientX - drag.startX;
    const dy = e.clientY - drag.startY;
    if (Math.abs(dx) > 3 || Math.abs(dy) > 3) {
      drag.moved = true;
    }
    const maxRight = Math.max(
      EDGE_GUTTER,
      window.innerWidth - LAUNCHER_WIDTH - EDGE_GUTTER
    );
    const maxBottom = Math.max(
      EDGE_GUTTER,
      window.innerHeight - LAUNCHER_HEIGHT - EDGE_GUTTER
    );
    const nextRight = Math.min(
      maxRight,
      Math.max(EDGE_GUTTER, drag.startRight - dx)
    );
    const nextBottom = Math.min(
      maxBottom,
      Math.max(EDGE_GUTTER, drag.startBottom - dy)
    );
    drag.currentRight = nextRight;
    drag.currentBottom = nextBottom;
    setDockPos({ right: nextRight, bottom: nextBottom });
  };

  const endDragDock = (e: ReactPointerEvent<HTMLButtonElement>) => {
    const drag = dragStateRef.current;
    if (!drag.active) return;
    drag.active = false;
    setIsDraggingDock(false);
    if (isDesktop) {
      window.localStorage.setItem(
        CHAT_DOCK_POS_KEY,
        JSON.stringify({
          right: drag.currentRight,
          bottom: drag.currentBottom,
        })
      );
    }
    (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
  };

  if (!user?.id) return null;

  const showConversationList = !activePeerId;
  const hasActiveConversation = !!activePeerId;

  return (
    <div
      className="pointer-events-none fixed right-3 bottom-3 left-3 z-70 sm:left-auto"
      style={
        isDesktop
          ? {
              right: `${dockPos.right}px`,
              bottom: `${dockPos.bottom}px`,
            }
          : undefined
      }
    >
      {open && (
        <div
          className={clsx(
            "pointer-events-auto flex overflow-hidden border border-slate-200/90 bg-white/95 shadow-[0_12px_36px_rgba(15,23,42,0.2)] backdrop-blur-sm dark:border-slate-700/90 dark:bg-slate-800/95 dark:shadow-[0_14px_38px_rgba(0,0,0,0.45)]",
            isFullscreen
              ? "fixed inset-3 z-80 h-auto max-h-none w-auto rounded-2xl sm:inset-5"
              : clsx(
                  "mb-3 h-[70vh] max-h-155 w-full rounded-2xl sm:h-145",
                  hasActiveConversation ? "sm:w-[min(92vw,860px)]" : "sm:w-72.5"
                )
          )}
        >
          <div
            className={clsx(
              "flex h-full w-full flex-col sm:w-72.5",
              hasActiveConversation &&
                "border-r border-slate-200 dark:border-slate-700",
              showConversationList ? "flex" : "hidden"
            )}
          >
            <div className="border-b border-slate-200 bg-slate-50/80 px-4 py-3 dark:border-slate-700 dark:bg-slate-800">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-sm font-semibold tracking-tight text-slate-900 dark:text-white">
                    Messages
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Choose a person to chat
                  </p>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="rounded-full border border-slate-200 bg-white px-2 py-0.5 text-[10px] font-semibold text-slate-600 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-200">
                    {sortedConversations.length}
                  </span>
                  {unreadCount > 0 && (
                    <span className="border-primary-300 bg-primary-50 text-primary-700 dark:border-primary-500/60 dark:bg-primary-900/30 dark:text-primary-200 rounded-full border px-2 py-0.5 text-[10px] font-semibold">
                      {unreadCount} unread
                    </span>
                  )}
                </div>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto">
              {loading ? (
                <p className="px-4 py-3 text-sm text-slate-600 dark:text-slate-300">
                  Loading...
                </p>
              ) : conversationItems.length === 0 ? (
                <div className="px-4 py-8 text-center">
                  <p className="text-sm font-medium text-slate-700 dark:text-slate-200">
                    No conversations yet
                  </p>
                  <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                    Start a chat from any profile to begin messaging.
                  </p>
                </div>
              ) : (
                <div className="p-2">
                  {sortedConversations.map((conv, index) => {
                    const pid = String(conv.user?.id ?? "");
                    const isActive = activePeerId === pid;
                    const isLastFromMe =
                      String(conv.last_message?.sender_id ?? "") ===
                      String(user?.id ?? "");
                    const previewText = (
                      conv.last_message?.content || ""
                    ).trim();
                    const preview = previewText
                      ? `${isLastFromMe ? "You: " : ""}${previewText}`
                      : "Start chatting";
                    const timeLabel = formatConversationTime(
                      conv.last_message?.created_at
                    );
                    return (
                      <div key={pid}>
                        {index > 0 && (
                          <div className="mx-3 my-1 h-px bg-slate-200/80 dark:bg-slate-700/80" />
                        )}
                        <button
                          type="button"
                          onClick={() => setActivePeerId(pid)}
                          className={clsx(
                            "relative w-full rounded-xl border px-3 py-3 text-left transition",
                            isActive
                              ? "border-primary-800 bg-primary-800 dark:border-primary-600 dark:bg-primary-700 text-white shadow-sm"
                              : "border-transparent bg-transparent hover:border-slate-200 hover:bg-slate-50 dark:hover:border-slate-600 dark:hover:bg-slate-700/70"
                          )}
                        >
                          {isActive && (
                            <span className="absolute top-2 bottom-2 left-0.5 w-1 rounded-full bg-white/80 dark:bg-white/70" />
                          )}
                          <div className="flex items-start gap-3">
                            <span
                              role="link"
                              tabIndex={0}
                              onClick={(e) => {
                                e.stopPropagation();
                                window.location.href = `/profile/?id=${encodeURIComponent(pid)}`;
                              }}
                              onKeyDown={(e) => {
                                if (e.key === "Enter" || e.key === " ") {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  window.location.href = `/profile/?id=${encodeURIComponent(pid)}`;
                                }
                              }}
                              className="cursor-pointer"
                              aria-label={`Open ${conv.user?.name || "researcher"} profile`}
                              title={`View ${conv.user?.name || "researcher"} profile`}
                            >
                              <Avatar
                                userId={pid}
                                name={conv.user?.name}
                                profileTitle={conv.user?.title}
                                size={36}
                                className={clsx(
                                  "mt-0.5 transition",
                                  isActive
                                    ? "ring-primary-200/80 dark:ring-primary-200/70 shadow-sm ring-2"
                                    : "ring-1 ring-slate-200 dark:ring-slate-700"
                                )}
                                fallbackClassName={clsx(
                                  isActive
                                    ? "bg-slate-200 text-slate-800 dark:bg-slate-700 dark:text-slate-100"
                                    : "bg-linear-to-br from-slate-100 to-slate-200 text-slate-700 dark:from-slate-800 dark:to-slate-700 dark:text-slate-200"
                                )}
                                textClassName="text-[11px] font-semibold"
                              />
                            </span>
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center justify-between gap-2">
                                <p
                                  className={clsx(
                                    "truncate text-sm font-semibold",
                                    isActive
                                      ? "text-white"
                                      : "text-slate-900 dark:text-white"
                                  )}
                                >
                                  {conv.user?.name || "Researcher"}
                                </p>
                                <div className="flex items-center gap-1.5">
                                  {timeLabel && (
                                    <span
                                      className={clsx(
                                        "text-[10px] font-medium",
                                        isActive
                                          ? "text-primary-100/90"
                                          : "text-slate-400 dark:text-slate-500"
                                      )}
                                    >
                                      {timeLabel}
                                    </span>
                                  )}
                                  {(conv.unread_count ?? 0) > 0 && (
                                    <span
                                      className={clsx(
                                        "rounded-full px-1.5 py-0.5 text-[10px] font-semibold",
                                        isActive
                                          ? "bg-white/20 text-white"
                                          : "bg-primary-600 dark:bg-primary-500 text-white"
                                      )}
                                    >
                                      {conv.unread_count}
                                    </span>
                                  )}
                                </div>
                              </div>
                              {conv.user?.title && (
                                <p
                                  className={clsx(
                                    "truncate text-[11px]",
                                    isActive
                                      ? "text-primary-100"
                                      : "text-slate-500 dark:text-slate-400"
                                  )}
                                >
                                  {conv.user.title}
                                </p>
                              )}
                              <p
                                className={clsx(
                                  "mt-0.5 truncate text-xs leading-relaxed",
                                  isActive
                                    ? "text-primary-100/90"
                                    : "text-slate-500 dark:text-slate-400"
                                )}
                              >
                                {preview}
                              </p>
                            </div>
                          </div>
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          <div
            className={clsx(
              "flex min-w-0 flex-1 flex-col",
              activePeerId ? "flex" : "hidden"
            )}
          >
            <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50/85 px-3 py-2.5 dark:border-slate-700 dark:bg-slate-800">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setActivePeerId(null)}
                    className="rounded p-1 text-slate-500 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-700"
                    aria-label="Back to people"
                  >
                    <ArrowLeftIcon className="h-4 w-4" />
                  </button>
                  {activePeerId ? (
                    <div className="flex items-center gap-2">
                      <Avatar
                        userId={activePeerId}
                        name={
                          activeConversation?.user?.name || activePeerNameHint
                        }
                        profileTitle={activeConversation?.user?.title}
                        href={`/profile/?id=${encodeURIComponent(activePeerId)}`}
                        title="View active profile"
                        size={28}
                        className="ring-1 ring-slate-200 transition dark:ring-slate-700"
                        fallbackClassName="bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
                        textClassName="text-[10px] font-semibold"
                      />
                      <div className="min-w-0">
                        <Link
                          href={`/profile/?id=${encodeURIComponent(activePeerId)}`}
                          className="block truncate text-sm font-semibold text-slate-900 hover:underline dark:text-white"
                        >
                          {activeConversation?.user?.name ||
                            activePeerNameHint ||
                            "Researcher"}
                        </Link>
                        {activeConversation?.user?.title && (
                          <p className="truncate text-[11px] text-slate-500 dark:text-slate-400">
                            {activeConversation.user.title}
                          </p>
                        )}
                        <p className="mt-0.5 text-[10px] font-semibold tracking-wide text-slate-600 uppercase dark:text-slate-300">
                          Active conversation
                        </p>
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm font-semibold text-slate-900 dark:text-white">
                      Select a conversation
                    </p>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setIsFullscreen((v) => !v)}
                  className="rounded p-1 text-slate-500 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-700"
                  aria-label={
                    isFullscreen ? "Exit full screen" : "Enter full screen"
                  }
                >
                  {isFullscreen ? (
                    <ArrowsPointingInIcon className="h-5 w-5" />
                  ) : (
                    <ArrowsPointingOutIcon className="h-5 w-5" />
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setOpen(false);
                    setIsFullscreen(false);
                  }}
                  className="rounded p-1 text-slate-500 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-700"
                  aria-label="Minimize chat"
                >
                  <MinusSmallIcon className="h-5 w-5" />
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setOpen(false);
                    setIsFullscreen(false);
                  }}
                  className="rounded p-1 text-slate-500 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-700"
                  aria-label="Close chat"
                >
                  <XMarkIcon className="h-5 w-5" />
                </button>
              </div>
            </div>

            <div
              ref={threadScrollRef}
              className="flex-1 space-y-2 overflow-y-auto bg-slate-50/65 p-3 dark:bg-slate-800/80"
            >
              {error ? (
                <p className="text-sm text-red-600 dark:text-red-400">
                  {error}
                </p>
              ) : !activePeerId ? (
                <div className="mx-auto mt-10 max-w-sm rounded-xl border border-slate-200 bg-white px-4 py-5 text-center shadow-sm dark:border-slate-600 dark:bg-slate-700/70">
                  <p className="text-sm font-medium text-slate-800 dark:text-slate-100">
                    Select a conversation
                  </p>
                  <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                    Choose a person from the left panel to start chatting.
                  </p>
                </div>
              ) : threadItems.length === 0 ? (
                <div className="mx-auto mt-10 max-w-sm rounded-xl border border-slate-200 bg-white px-4 py-5 text-center shadow-sm dark:border-slate-600 dark:bg-slate-700/70">
                  <p className="text-sm font-medium text-slate-800 dark:text-slate-100">
                    No messages yet
                  </p>
                  <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                    Send the first message to begin this conversation.
                  </p>
                </div>
              ) : (
                threadItems.map((msg) => {
                  const mine = msg.sender_id === user?.id;
                  return (
                    <div
                      key={msg.id}
                      className={clsx(
                        "max-w-[88%] rounded-2xl border px-3 py-2 text-sm shadow-sm",
                        mine
                          ? "border-primary-700/30 bg-primary-700 dark:border-primary-600/40 dark:bg-primary-600 text-white"
                          : "border-slate-200 bg-white text-slate-800 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100"
                      )}
                    >
                      <p className="whitespace-pre-wrap">{msg.content}</p>
                      {msg.attachment?.download_url && (
                        <AttachmentChip
                          fileName={msg.attachment.file_name}
                          contentType={msg.attachment.content_type}
                          sizeBytes={msg.attachment.size_bytes}
                          href={`${API_URL}${msg.attachment.download_url}`}
                          tone={mine ? "inverse" : "default"}
                          className="mt-1"
                        />
                      )}
                      <p
                        className={clsx(
                          "mt-1 text-[10px]",
                          mine
                            ? "text-white/80"
                            : "text-slate-500 dark:text-slate-400"
                        )}
                      >
                        {formatWhen(msg.created_at)}
                      </p>
                    </div>
                  );
                })
              )}
            </div>

            <div className="border-t border-slate-200 bg-white/95 p-2.5 dark:border-slate-700 dark:bg-slate-800">
              <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-2 dark:border-slate-700 dark:bg-slate-900/50">
                <div className="flex items-end gap-2">
                  <TextArea
                    value={threadDraft}
                    onChange={(e) => setThreadDraft(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        if (
                          activePeerId &&
                          !threadSending &&
                          (threadDraft.trim().length > 0 || threadFile)
                        ) {
                          void sendThreadMessage();
                        }
                      }
                    }}
                    intent="default"
                    variant="outline"
                    size="sm"
                    radius="lg"
                    resize="none"
                    rows={2}
                    placeholder="Type a message..."
                    className="w-full"
                    textareaClassName="min-h-[44px] border-slate-300 bg-white leading-relaxed placeholder:text-slate-500 dark:border-slate-600 dark:bg-slate-900 dark:placeholder:text-slate-400"
                  />
                  <Button
                    size="sm"
                    intent="primary"
                    variant="solid"
                    endIcon={<PaperAirplaneIcon className="h-3.5 w-3.5" />}
                    className="h-9 px-3.5"
                    onClick={sendThreadMessage}
                    disabled={
                      !activePeerId ||
                      threadSending ||
                      (!threadDraft.trim() && !threadFile)
                    }
                  >
                    {threadSending ? "Sending..." : "Send"}
                  </Button>
                </div>
                <div className="mt-2 flex items-center">
                  <AttachmentPickerButton
                    onSelect={(file) => {
                      setError(null);
                      setThreadFile(file);
                    }}
                    onError={(msg) => setError(msg)}
                    disabled={threadSending || !activePeerId}
                    title="Attach"
                    className="hover:border-primary-400 hover:bg-primary-50 hover:text-primary-700 dark:hover:border-primary-500 dark:hover:bg-primary-900/25 dark:hover:text-primary-200 h-8 rounded-md border-slate-300 bg-white px-2.5 text-slate-700 shadow-sm dark:border-slate-600 dark:bg-slate-900 dark:text-slate-200"
                  />
                </div>
              </div>
              {threadFile && (
                <div className="mt-2">
                  <AttachmentChip
                    fileName={threadFile.name}
                    contentType={threadFile.type}
                    sizeBytes={threadFile.size}
                    onRemove={() => setThreadFile(null)}
                  />
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="pointer-events-auto flex justify-end">
        <button
          type="button"
          onClick={() => {
            // Click toggles; drag only repositions.
            if (dragStateRef.current.moved) {
              dragStateRef.current.moved = false;
              return;
            }
            setOpen((v) => !v);
            setIsFullscreen(false);
          }}
          onPointerDown={startDragDock}
          onPointerMove={moveDragDock}
          onPointerUp={endDragDock}
          onPointerCancel={endDragDock}
          className="theme-slate-solid-button relative inline-flex items-center gap-2 rounded-full px-4 py-3 text-sm font-semibold shadow-lg transition"
          aria-label={open ? "Close messages" : "Open messages"}
          title={isDesktop ? "Drag to move Messages button" : undefined}
        >
          <ChatBubbleLeftRightIcon className="h-5 w-5" />
          <span className="hidden sm:inline">Messages</span>
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 rounded-full bg-red-500 px-1.5 py-0.5 text-[10px] leading-none font-bold text-white">
              {unreadCount > 99 ? "99+" : unreadCount}
            </span>
          )}
        </button>
      </div>
    </div>
  );
}
