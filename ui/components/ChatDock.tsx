"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import clsx from "clsx";
import axios from "axios";
import { API_URL } from "@/data/global";
import { getAuthHeaders } from "@/lib/apiAuth";
import { useAuthStore } from "@/store/useAuthStore";
import Button from "@/components/ui/Button";
import AttachmentChip from "@/components/ui/AttachmentChip";
import AttachmentPickerButton from "@/components/ui/AttachmentPickerButton";
import Link from "next/link";
import {
  ChatBubbleLeftRightIcon,
  XMarkIcon,
  ArrowLeftIcon,
  ArrowsPointingOutIcon,
  ArrowsPointingInIcon,
  MinusSmallIcon,
} from "@heroicons/react/24/outline";
import Avatar from "@/components/Avatar";

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
  const threadScrollRef = useRef<HTMLDivElement | null>(null);

  const activeConversation = useMemo(
    () =>
      conversationItems.find((c) => String(c.user?.id ?? "") === activePeerId),
    [conversationItems, activePeerId]
  );

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

  if (!user?.id) return null;

  const showListOnMobile = !activePeerId;

  return (
    <div className="pointer-events-none fixed right-3 bottom-3 left-3 z-70 sm:right-5 sm:bottom-5 sm:left-auto">
      {open && (
        <div
          className={clsx(
            "pointer-events-auto flex overflow-hidden border border-slate-200/90 bg-slate-50/95 shadow-2xl dark:border-slate-700/90 dark:bg-slate-900/95",
            isFullscreen
              ? "fixed inset-3 z-80 h-auto max-h-none w-auto rounded-2xl sm:inset-5"
              : "mb-3 h-[70vh] max-h-155 w-full rounded-2xl sm:h-145 sm:w-[min(92vw,860px)]"
          )}
        >
          <div
            className={clsx(
              "flex h-full w-full flex-col border-r border-slate-200 sm:w-72.5 dark:border-slate-700",
              showListOnMobile ? "block" : "hidden sm:block"
            )}
          >
            <div className="border-b border-slate-200 px-4 py-3 dark:border-slate-700">
              <p className="text-sm font-semibold text-slate-900 dark:text-white">
                Messages
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Choose a person to chat
              </p>
            </div>
            <div className="flex-1 overflow-y-auto">
              {loading ? (
                <p className="px-4 py-3 text-sm text-slate-600 dark:text-slate-300">
                  Loading...
                </p>
              ) : conversationItems.length === 0 ? (
                <p className="px-4 py-3 text-sm text-slate-600 dark:text-slate-300">
                  No conversations yet.
                </p>
              ) : (
                conversationItems.map((conv) => {
                  const pid = String(conv.user?.id ?? "");
                  const isActive = activePeerId === pid;
                  return (
                    <button
                      key={pid}
                      type="button"
                      onClick={() => setActivePeerId(pid)}
                      className={clsx(
                        "w-full border-b border-slate-100 px-4 py-3 text-left transition dark:border-slate-800",
                        isActive
                          ? "border-l-4 border-l-slate-500 bg-slate-100 pl-3 shadow-sm dark:border-l-slate-300 dark:bg-slate-800/80"
                          : "bg-slate-50 hover:bg-slate-100 dark:bg-slate-900 dark:hover:bg-slate-800"
                      )}
                    >
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
                                ? "shadow-sm ring-2 ring-slate-300 dark:ring-slate-500/60"
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
                                  ? "text-slate-900 dark:text-slate-100"
                                  : "text-slate-900 dark:text-white"
                              )}
                            >
                              {conv.user?.name || "Researcher"}
                            </p>
                            {(conv.unread_count ?? 0) > 0 && (
                              <span
                                className={clsx(
                                  "rounded-full px-1.5 py-0.5 text-[10px] font-semibold",
                                  isActive
                                    ? "bg-slate-700 text-white dark:bg-slate-500"
                                    : "bg-slate-700 text-white dark:bg-slate-600"
                                )}
                              >
                                {conv.unread_count}
                              </span>
                            )}
                          </div>
                          {conv.user?.title && (
                            <p
                              className={clsx(
                                "truncate text-[11px]",
                                isActive
                                  ? "text-slate-700 dark:text-slate-300"
                                  : "text-slate-500 dark:text-slate-400"
                              )}
                            >
                              {conv.user.title}
                            </p>
                          )}
                          <p
                            className={clsx(
                              "mt-0.5 truncate text-xs",
                              isActive
                                ? "text-slate-600 dark:text-slate-400"
                                : "text-slate-500 dark:text-slate-400"
                            )}
                          >
                            {conv.last_message?.content || "Start chatting"}
                          </p>
                        </div>
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </div>

          <div
            className={clsx(
              "flex min-w-0 flex-1 flex-col",
              showListOnMobile ? "hidden sm:flex" : "flex"
            )}
          >
            <div className="flex items-center justify-between border-b border-slate-200 bg-slate-100/80 px-3 py-2 dark:border-slate-700 dark:bg-slate-900/75">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setActivePeerId(null)}
                    className="rounded p-1 text-slate-500 hover:bg-slate-100 sm:hidden dark:text-slate-300 dark:hover:bg-slate-800"
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
                  className="rounded p-1 text-slate-500 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
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
                  className="rounded p-1 text-slate-500 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
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
                  className="rounded p-1 text-slate-500 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
                  aria-label="Close chat"
                >
                  <XMarkIcon className="h-5 w-5" />
                </button>
              </div>
            </div>

            <div
              ref={threadScrollRef}
              className="flex-1 space-y-2 overflow-y-auto bg-slate-100/60 p-3 dark:bg-slate-950/35"
            >
              {error ? (
                <p className="text-sm text-red-600 dark:text-red-400">
                  {error}
                </p>
              ) : !activePeerId ? (
                <p className="text-sm text-slate-600 dark:text-slate-300">
                  Select a person from the list.
                </p>
              ) : threadItems.length === 0 ? (
                <p className="text-sm text-slate-600 dark:text-slate-300">
                  No messages yet. Say hello 👋
                </p>
              ) : (
                threadItems.map((msg) => {
                  const mine = msg.sender_id === user?.id;
                  return (
                    <div
                      key={msg.id}
                      className={clsx(
                        "max-w-[88%] rounded-lg px-3 py-2 text-sm shadow-sm",
                        mine
                          ? "ml-auto bg-slate-700 text-white dark:bg-slate-600"
                          : "bg-slate-200 text-slate-800 dark:bg-slate-700 dark:text-slate-100"
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

            <div className="border-t border-slate-200 bg-slate-50 p-2 dark:border-slate-700 dark:bg-slate-900/90">
              <div className="flex items-end gap-2">
                <textarea
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
                  rows={2}
                  placeholder="Type a message..."
                  className="focus:border-primary-500 w-full rounded-md border border-slate-300 bg-transparent px-3 py-2 text-sm text-slate-900 outline-none dark:border-slate-600 dark:text-slate-100"
                />
                <AttachmentPickerButton
                  onSelect={(file) => {
                    setError(null);
                    setThreadFile(file);
                  }}
                  onError={(msg) => setError(msg)}
                  disabled={threadSending || !activePeerId}
                  title="Attach"
                />
                <Button
                  size="sm"
                  intent="primary"
                  variant="solid"
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
            setOpen((v) => !v);
            setIsFullscreen(false);
          }}
          className="theme-slate-solid-button relative inline-flex items-center gap-2 rounded-full px-4 py-3 text-sm font-semibold shadow-lg transition"
          aria-label={open ? "Close messages" : "Open messages"}
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
