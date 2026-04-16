"use client";

import { useMemo, useState } from "react";
import {
  MagnifyingGlassIcon,
  PlusIcon,
  TrashIcon,
  UserMinusIcon,
  UserPlusIcon,
} from "@heroicons/react/24/outline";
import SidebarLayout from "@/components/SidebarLayout";
import PageHeader from "@/components/PageHeader";
import Button from "@/components/ui/Button";
import InputField from "@/components/ui/InputField";
import TextArea from "@/components/ui/TextArea";
import Avatar from "@/components/Avatar";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useAuthStore } from "@/store/useAuthStore";
import {
  type GroupItem,
  type GroupMessage,
  type GroupMessageReply,
  useApproveGroupMember,
  useCreateGroupMessageReply,
  useCreateGroup,
  useDeclineGroupMember,
  useGroupMessageReplies,
  useGroupMembers,
  useGroupMessages,
  useGroups,
  useInviteToGroup,
  useDeleteGroup,
  useDeleteGroupMessage,
  useUpdateGroupMessage,
  useLeaveGroup,
  useRemoveGroupMember,
  useRequestJoinGroup,
  useSendGroupMessage,
} from "@/store/useGroupStore";
import { API_URL } from "@/data/global";
import { cn } from "@/lib/utils";
import AttachmentChip from "@/components/AttachmentChip";
import AttachmentPickerButton from "@/components/AttachmentPickerButton";
import Loading from "@/app/loading";

const GROUP_AVATAR_CLASS =
  "bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-200";

function getGroupColor() {
  return GROUP_AVATAR_CLASS;
}

function formatWhen(dateIso?: string): string {
  if (!dateIso) return "";
  return new Date(dateIso).toLocaleString();
}

function toErrorMessage(error: unknown, fallback: string): string {
  const e = error as {
    response?: { data?: { detail?: unknown } };
    message?: unknown;
  };
  const detail = e?.response?.data?.detail;
  if (typeof detail === "string" && detail.trim()) return detail;
  const message = e?.message;
  if (typeof message === "string" && message.trim()) return message;
  return fallback;
}

function TeamMessageCard({
  groupId,
  message,
  currentUserId,
  isAdmin,
}: {
  groupId: string;
  message: GroupMessage;
  currentUserId?: string;
  isAdmin?: boolean;
}) {
  const [showReplies, setShowReplies] = useState(false);
  const [replyTargetId, setReplyTargetId] = useState<string | null>(null);
  const [replyDraft, setReplyDraft] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [editDraft, setEditDraft] = useState(message.content);
  const { data: replies = [], isLoading: loadingReplies } =
    useGroupMessageReplies(groupId, showReplies ? message.id : null);
  const createReplyMutation = useCreateGroupMessageReply();
  const deleteMessageMutation = useDeleteGroupMessage();
  const updateMessageMutation = useUpdateGroupMessage();

  const isOwn = message.sender_id === currentUserId;
  const canEdit = isOwn;
  const canDelete = isOwn || isAdmin;

  const handleSaveEdit = async () => {
    const content = editDraft.trim();
    if (!content || content === message.content) {
      setIsEditing(false);
      return;
    }
    await updateMessageMutation.mutateAsync({
      groupId,
      messageId: message.id,
      content,
    });
    setIsEditing(false);
  };

  const handleDelete = () => {
    void deleteMessageMutation.mutateAsync({ groupId, messageId: message.id });
  };

  const rootReplies = replies.filter((r) => !r.parent_reply_id);
  const repliesByParent = replies.reduce<Record<string, GroupMessageReply[]>>(
    (acc, r) => {
      if (!r.parent_reply_id) return acc;
      if (!acc[r.parent_reply_id]) acc[r.parent_reply_id] = [];
      acc[r.parent_reply_id].push(r);
      return acc;
    },
    {}
  );

  const handleReply = async (parentReplyId?: string) => {
    const content = replyDraft.trim();
    if (!content) return;
    await createReplyMutation.mutateAsync({
      groupId,
      messageId: message.id,
      content,
      parentReplyId,
    });
    setReplyDraft("");
    setReplyTargetId(null);
    setShowReplies(true);
  };

  return (
    <article className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900/80">
      <div className="flex items-start gap-3">
        <Avatar
          userId={message.sender?.id}
          name={message.sender?.name}
          firstName={message.sender?.first_name}
          lastName={message.sender?.last_name}
          src={message.sender?.profile_image_url}
          href={
            message.sender?.id
              ? `/profile/?id=${encodeURIComponent(message.sender.id)}`
              : undefined
          }
          title="View profile"
          size={36}
        />
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-slate-900 dark:text-white">
                {message.sender_id === currentUserId
                  ? "You"
                  : message.sender?.name || "Researcher"}
              </p>
              <p className="truncate text-xs text-slate-500 dark:text-slate-400">
                {message.sender?.title || "Team member"}
              </p>
            </div>
            {(canEdit || canDelete) && (
              <div className="flex shrink-0 items-center gap-1">
                {canEdit && !isEditing && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setEditDraft(message.content);
                      setIsEditing(true);
                    }}
                  >
                    Edit
                  </Button>
                )}
                {canDelete && (
                  <Button
                    size="sm"
                    variant="outline"
                    intent="danger"
                    loading={deleteMessageMutation.isPending}
                    onClick={handleDelete}
                  >
                    Delete
                  </Button>
                )}
              </div>
            )}
          </div>

          {isEditing ? (
            <div className="mt-2 space-y-2">
              <TextArea
                value={editDraft}
                onChange={(e) => setEditDraft(e.target.value)}
                rows={2}
                autoGrow
              />
              <div className="flex gap-2">
                <Button
                  size="sm"
                  intent="primary"
                  loading={updateMessageMutation.isPending}
                  onClick={handleSaveEdit}
                >
                  Save
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setIsEditing(false)}
                >
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <>
              <p className="mt-2 text-sm whitespace-pre-wrap text-slate-800 dark:text-slate-100">
                {message.content}
              </p>
              {message.attachment?.download_url && (
                <AttachmentChip
                  fileName={message.attachment.file_name}
                  contentType={message.attachment.content_type}
                  sizeBytes={message.attachment.size_bytes}
                  href={`${API_URL}${message.attachment.download_url}`}
                  className="mt-2"
                />
              )}
            </>
          )}

          <div className="mt-3 flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => setShowReplies((prev) => !prev)}
            >
              {showReplies ? "Hide Replies" : `Reply (${replies.length})`}
            </Button>
            <span className="text-[11px] text-slate-500 dark:text-slate-400">
              {formatWhen(message.created_at)}
            </span>
          </div>
        </div>
      </div>

      {showReplies && (
        <div className="mt-3 space-y-2 border-t border-slate-200 pt-3 dark:border-slate-700">
          {loadingReplies ? (
            <Loading mode="inline" size="sm" title="Loading replies..." />
          ) : rootReplies.length === 0 ? (
            <p className="text-xs text-slate-500">No replies yet.</p>
          ) : (
            rootReplies.map((r) => (
              <div
                key={r.id}
                className="space-y-2 rounded-lg bg-slate-50 p-2 dark:bg-slate-800/40"
              >
                <div className="flex items-start gap-2">
                  <Avatar
                    userId={r.sender?.id}
                    name={r.sender?.name}
                    firstName={r.sender?.first_name}
                    lastName={r.sender?.last_name}
                    src={r.sender?.profile_image_url}
                    href={
                      r.sender?.id
                        ? `/profile/?id=${encodeURIComponent(r.sender.id)}`
                        : undefined
                    }
                    title="View profile"
                    size={24}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-semibold text-slate-900 dark:text-white">
                      {r.sender_id === currentUserId
                        ? "You"
                        : r.sender?.name || "Researcher"}
                    </p>
                    <p className="text-xs text-slate-700 dark:text-slate-200">
                      {r.content}
                    </p>
                    <div className="mt-1 flex items-center gap-2">
                      <Button
                        variant="link"
                        size="sm"
                        intent="primary"
                        onClick={() =>
                          setReplyTargetId(replyTargetId === r.id ? null : r.id)
                        }
                      >
                        Reply
                      </Button>
                      <span className="text-[10px] text-slate-500 dark:text-slate-400">
                        {formatWhen(r.created_at)}
                      </span>
                    </div>
                  </div>
                </div>

                {(repliesByParent[r.id] ?? []).map((rr) => (
                  <div
                    key={rr.id}
                    className="ml-6 flex items-start gap-2 rounded-md bg-white p-2 dark:bg-slate-900/60"
                  >
                    <Avatar
                      userId={rr.sender?.id}
                      name={rr.sender?.name}
                      firstName={rr.sender?.first_name}
                      lastName={rr.sender?.last_name}
                      src={rr.sender?.profile_image_url}
                      href={
                        rr.sender?.id
                          ? `/profile/?id=${encodeURIComponent(rr.sender.id)}`
                          : undefined
                      }
                      title="View profile"
                      size={20}
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[11px] font-semibold text-slate-900 dark:text-white">
                        {rr.sender_id === currentUserId
                          ? "You"
                          : rr.sender?.name || "Researcher"}
                      </p>
                      <p className="text-xs text-slate-700 dark:text-slate-200">
                        {rr.content}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ))
          )}

          <div className="space-y-2">
            <TextArea
              rows={2}
              placeholder={
                replyTargetId
                  ? "Write a nested reply..."
                  : "Reply to this message..."
              }
              value={replyDraft}
              onChange={(e) => setReplyDraft(e.target.value)}
            />
            <div className="flex justify-end gap-2">
              {replyTargetId && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setReplyTargetId(null)}
                >
                  Cancel nested reply
                </Button>
              )}
              <Button
                size="sm"
                intent="primary"
                onClick={() => {
                  void handleReply(replyTargetId ?? undefined);
                }}
                disabled={createReplyMutation.isPending || !replyDraft.trim()}
              >
                {createReplyMutation.isPending ? "Posting..." : "Post Reply"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </article>
  );
}

export default function GroupsPage() {
  const { user } = useAuthStore();
  const [activeGroupId, setActiveGroupId] = useState<string | null>(null);
  const [createTeamOpen, setCreateTeamOpen] = useState(false);
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
  const [allMembersOpen, setAllMembersOpen] = useState(false);
  const [deleteTeamOpen, setDeleteTeamOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [teamSearch, setTeamSearch] = useState("");
  const [newGroupName, setNewGroupName] = useState("");
  const [newGroupDescription, setNewGroupDescription] = useState("");
  const [newGroupVisibility, setNewGroupVisibility] = useState<
    "public" | "private"
  >("public");
  const [inviteEmailDraft, setInviteEmailDraft] = useState("");
  const [newMessage, setNewMessage] = useState("");
  const [newMessageFile, setNewMessageFile] = useState<File | null>(null);
  const [actionError, setActionError] = useState("");

  const { data: groups = [], isLoading: loadingGroups } = useGroups({
    mineOnly: false,
    search: teamSearch,
    publicOnly: true,
  });
  const { data: myGroups = [] } = useGroups(true);
  const myActiveGroups = useMemo(
    () => myGroups.filter((g) => g.status === "active"),
    [myGroups]
  );

  const allVisibleGroups = useMemo(() => {
    const byId = new Map<string, GroupItem>();
    for (const g of myGroups) byId.set(g.id, g);
    for (const g of groups) byId.set(g.id, { ...byId.get(g.id), ...g });
    return Array.from(byId.values());
  }, [myGroups, groups]);

  const resolvedActiveGroupId = useMemo(() => {
    if (activeGroupId && myGroups.some((g) => g.id === activeGroupId)) {
      return activeGroupId;
    }
    return null;
  }, [activeGroupId, myGroups]);

  const createGroupMutation = useCreateGroup();
  const requestJoinMutation = useRequestJoinGroup();
  const inviteMutation = useInviteToGroup();
  const sendMessageMutation = useSendGroupMessage();
  const approveMemberMutation = useApproveGroupMember();
  const declineMemberMutation = useDeclineGroupMember();
  const leaveGroupMutation = useLeaveGroup();
  const removeMemberMutation = useRemoveGroupMember();
  const deleteGroupMutation = useDeleteGroup();

  const activeGroup = useMemo(
    () => allVisibleGroups.find((g) => g.id === resolvedActiveGroupId) ?? null,
    [allVisibleGroups, resolvedActiveGroupId]
  );

  const activeMembership = useMemo(
    () => myGroups.find((g) => g.id === resolvedActiveGroupId) ?? null,
    [myGroups, resolvedActiveGroupId]
  );

  const canAccessTeamData = Boolean(
    activeMembership && activeMembership.status === "active"
  );
  const { data: members = [] } = useGroupMembers(
    canAccessTeamData ? resolvedActiveGroupId : null
  );
  const { data: messages = [], isLoading: loadingMessages } = useGroupMessages(
    canAccessTeamData ? resolvedActiveGroupId : null
  );

  const canChat = canAccessTeamData;
  const isAdmin = Boolean(
    activeMembership &&
    (activeMembership.role === "owner" || activeMembership.role === "admin")
  );
  const isOwner = activeMembership?.role === "owner";

  const pendingGroups = useMemo(
    () =>
      myGroups.filter((g) => g.status === "pending" || g.status === "invited"),
    [myGroups]
  );

  const activeMembers = useMemo(
    () => members.filter((m) => m.status === "active"),
    [members]
  );

  const pendingMembers = useMemo(
    () => members.filter((m) => m.status === "pending"),
    [members]
  );
  const normalizedTeamSearch = teamSearch.trim();
  const shouldShowSearchResults = normalizedTeamSearch.length >= 2;

  const handleCreateGroup = async () => {
    const name = newGroupName.trim();
    if (!name) return;
    try {
      const group = await createGroupMutation.mutateAsync({
        name,
        description: newGroupDescription.trim(),
        visibility: newGroupVisibility,
      });
      setActionError("");
      setNewGroupName("");
      setNewGroupDescription("");
      setNewGroupVisibility("public");
      setCreateTeamOpen(false);
      setActiveGroupId(group.id);
    } catch {
      setActionError("Failed to create team. Please try again.");
    }
  };

  const handleSend = async () => {
    const text = newMessage.trim();
    if (!resolvedActiveGroupId || (!text && !newMessageFile)) return;
    try {
      await sendMessageMutation.mutateAsync({
        groupId: resolvedActiveGroupId,
        content: text,
        file: newMessageFile,
      });
      setActionError("");
      setNewMessage("");
      setNewMessageFile(null);
    } catch {
      setActionError("Failed to send message. Please try again.");
    }
  };

  const handleInviteByEmail = async () => {
    const email = inviteEmailDraft.trim();
    if (!resolvedActiveGroupId || !email) return;
    try {
      await inviteMutation.mutateAsync({
        groupId: resolvedActiveGroupId,
        email,
      });
      setActionError("");
      setInviteEmailDraft("");
      setInviteDialogOpen(false);
    } catch {
      setActionError("Failed to send invite. Please try again.");
    }
  };

  return (
    <div className="min-h-screen bg-linear-to-b from-slate-50 to-white px-4 py-8 sm:px-6 lg:px-8 dark:from-slate-950 dark:to-slate-900">
      <div className="mx-auto max-w-7xl">
        <PageHeader
          variant="collaborators"
          title="Research Teams"
          subtitle="Search public teams, request access, and collaborate in real time."
        />

        {!user?.id ? (
          <div className="rounded-xl border border-slate-200 bg-white p-6 text-center shadow-sm dark:border-slate-700 dark:bg-slate-800">
            <h3 className="text-base font-semibold text-slate-900 dark:text-white">
              Collaborate faster with Research Teams
            </h3>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
              Create or join teams, post updates, reply to threads, and
              coordinate with collaborators in one place.
            </p>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              Sign in or create an account to start team collaboration.
            </p>
            <div className="mt-4 flex justify-center gap-2">
              <Button
                intent="primary"
                href="/login/"
                startIcon={<UserPlusIcon className="h-4 w-4" />}
              >
                Sign in / Create account
              </Button>
            </div>
          </div>
        ) : (
          <>
            <div className="mb-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-800">
              <div className="flex flex-col gap-3">
                <InputField
                  startIcon={
                    <MagnifyingGlassIcon className="h-4 w-4 text-slate-400" />
                  }
                  placeholder="Search public teams by name or description"
                  value={teamSearch}
                  onChange={(e) => setTeamSearch(e.target.value)}
                />
                <div className="flex items-center justify-between gap-3">
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Private teams do not appear in search.
                  </p>
                  <p className="text-xs font-medium text-slate-600 dark:text-slate-300">
                    {shouldShowSearchResults
                      ? `${groups.length} result${groups.length === 1 ? "" : "s"}`
                      : "Type at least 2 characters"}
                  </p>
                </div>
              </div>
              <div className="mt-3 grid max-h-[32vh] grid-cols-1 gap-1.5 overflow-y-auto sm:grid-cols-2 lg:grid-cols-3">
                {!shouldShowSearchResults ? (
                  <p className="px-1 py-2 text-sm text-slate-500">
                    Search to find teams and request access.
                  </p>
                ) : loadingGroups ? (
                  <p className="px-1 py-2 text-sm text-slate-500">
                    Loading teams...
                  </p>
                ) : groups.length === 0 ? (
                  <p className="px-1 py-2 text-sm text-slate-500">
                    No public teams found.
                  </p>
                ) : (
                  groups.map((group: GroupItem) => {
                    const mine = myGroups.find((g) => g.id === group.id);
                    const canRequestJoin =
                      group.visibility === "public" &&
                      (!mine || mine.status === "pending");
                    const isJoined = mine?.status === "active";
                    const isPending = mine?.status === "pending";
                    const statusText =
                      mine?.status === "active"
                        ? "Joined"
                        : mine?.status === "pending"
                          ? "Pending"
                          : mine?.status === "invited"
                            ? "Invited"
                            : "Not joined";
                    return (
                      <div
                        key={`search-${group.id}`}
                        className={cn(
                          "rounded-lg border border-slate-200 bg-slate-50 px-2 py-1.5 shadow-xs transition-all hover:border-slate-300 hover:bg-white dark:border-slate-700 dark:bg-slate-900/70 dark:hover:border-slate-600 dark:hover:bg-slate-900"
                        )}
                      >
                        <div className="w-full text-left">
                          <div className="flex items-start justify-between gap-2">
                            <p className="truncate pr-1 text-xs font-semibold text-slate-900 dark:text-white">
                              {group.name}
                            </p>
                            <div className="flex shrink-0 items-center gap-1">
                              <span className="rounded-full border border-sky-200 bg-sky-50 px-1.5 py-0.5 text-[9px] font-semibold text-sky-700 dark:border-sky-700/40 dark:bg-sky-900/20 dark:text-sky-300">
                                Public
                              </span>
                              <span
                                className={cn(
                                  "rounded-full border px-1.5 py-0.5 text-[9px] font-semibold",
                                  isJoined
                                    ? "border-green-200 bg-green-50 text-green-700 dark:border-green-700/40 dark:bg-green-900/20 dark:text-green-300"
                                    : isPending
                                      ? "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-700/40 dark:bg-amber-900/20 dark:text-amber-300"
                                      : "border-slate-200 bg-white text-slate-600 dark:border-slate-700 dark:bg-slate-800/70 dark:text-slate-300"
                                )}
                              >
                                {statusText}
                              </span>
                            </div>
                          </div>
                          <p className="mt-0.5 line-clamp-1 text-[10px] text-slate-600 dark:text-slate-300">
                            {group.description?.trim() || "No description yet."}
                          </p>
                        </div>
                        <div className="mt-2 flex items-center justify-end gap-1.5">
                          {canRequestJoin && (
                            <Button
                              size="sm"
                              intent="primary"
                              className="px-2 py-1 text-xs"
                              onClick={() => {
                                void requestJoinMutation
                                  .mutateAsync(group.id)
                                  .then(() => setActionError(""))
                                  .catch((error) => {
                                    setActionError(
                                      toErrorMessage(
                                        error,
                                        "Could not submit join request."
                                      )
                                    );
                                  });
                              }}
                              disabled={requestJoinMutation.isPending}
                            >
                              Request to Join
                            </Button>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            <SidebarLayout
              sidebarTitle="My Teams"
              open={sidebarOpen}
              onOpenChange={setSidebarOpen}
              sidebarWidth={270}
              sidebar={
                <div className="space-y-3">
                  {/* My Teams */}
                  <div className="rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-800">
                    <div className="flex items-center justify-between px-4 pt-4 pb-2">
                      <h3 className="text-xs font-semibold tracking-wide text-slate-500 uppercase dark:text-slate-400">
                        My Teams
                        {myActiveGroups.length > 0 && (
                          <span className="ml-2 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                            {myActiveGroups.length}
                          </span>
                        )}
                      </h3>
                      <Button
                        intent="primary"
                        size="sm"
                        onClick={() => setCreateTeamOpen(true)}
                        startIcon={<PlusIcon className="h-3.5 w-3.5" />}
                      >
                        New
                      </Button>
                    </div>
                    <div className="max-h-[40vh] space-y-0.5 overflow-y-auto p-2">
                      {myActiveGroups.length === 0 ? (
                        <p className="px-3 py-3 text-sm text-slate-500 dark:text-slate-400">
                          No teams yet.{" "}
                          <Button
                            variant="link"
                            size="sm"
                            intent="primary"
                            onClick={() => setCreateTeamOpen(true)}
                          >
                            Create one
                          </Button>
                        </p>
                      ) : (
                        myActiveGroups.map((group: GroupItem) => (
                          <button
                            key={`my-${group.id}`}
                            type="button"
                            onClick={() => setActiveGroupId(group.id)}
                            className={cn(
                              "flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left transition",
                              resolvedActiveGroupId === group.id
                                ? "bg-primary-600 text-white"
                                : "hover:bg-slate-100 dark:hover:bg-slate-800"
                            )}
                          >
                            <div
                              className={cn(
                                "flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-xs font-bold",
                                resolvedActiveGroupId === group.id
                                  ? "bg-white/20 text-white"
                                  : getGroupColor()
                              )}
                            >
                              {(group.name[0] ?? "T").toUpperCase()}
                            </div>
                            <div className="min-w-0">
                              <p className="truncate text-sm font-semibold">
                                {group.name}
                              </p>
                              <p
                                className={cn(
                                  "truncate text-xs capitalize",
                                  resolvedActiveGroupId === group.id
                                    ? "text-white/70"
                                    : "text-slate-500 dark:text-slate-400"
                                )}
                              >
                                {group.visibility} · {group.role}
                              </p>
                            </div>
                          </button>
                        ))
                      )}
                    </div>
                  </div>

                  {pendingGroups.length > 0 && (
                    <div className="rounded-xl border border-amber-200 bg-amber-50/60 p-3 shadow-sm dark:border-amber-800/40 dark:bg-amber-950/20">
                      <p className="mb-2 px-1 text-xs font-semibold tracking-wide text-amber-700 uppercase dark:text-amber-400">
                        Pending ({pendingGroups.length})
                      </p>
                      <div className="space-y-1.5">
                        {pendingGroups.map((g) => (
                          <div
                            key={`pending-${g.id}`}
                            className="flex items-center justify-between gap-2 rounded-lg border border-amber-200/60 bg-white px-3 py-2 dark:border-amber-800/30 dark:bg-slate-900/70"
                          >
                            <div className="min-w-0">
                              <p className="truncate text-sm font-semibold text-slate-900 dark:text-white">
                                {g.name}
                              </p>
                              <span className="text-[10px] font-medium text-amber-600 capitalize dark:text-amber-400">
                                {g.status === "invited"
                                  ? "Invited"
                                  : "Pending approval"}
                              </span>
                            </div>
                            <Button
                              size="sm"
                              variant="outline"
                              className="shrink-0"
                              onClick={() => {
                                void leaveGroupMutation
                                  .mutateAsync(g.id)
                                  .then(() => setActionError(""))
                                  .catch((error) => {
                                    setActionError(
                                      toErrorMessage(
                                        error,
                                        "Could not cancel join request."
                                      )
                                    );
                                  });
                              }}
                              disabled={leaveGroupMutation.isPending}
                            >
                              Cancel
                            </Button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              }
            >
              <section className="rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900/80">
                {!activeGroup ? (
                  <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3 p-8 text-center">
                    <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 dark:bg-slate-800">
                      <UserPlusIcon className="h-7 w-7 text-slate-400 dark:text-slate-500" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                        No team selected
                      </p>
                      <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                        Select a team from the sidebar or create a new one to
                        get started.
                      </p>
                    </div>
                    <Button
                      size="sm"
                      startIcon={<PlusIcon className="h-4 w-4" />}
                      onClick={() => setCreateTeamOpen(true)}
                    >
                      Create Team
                    </Button>
                  </div>
                ) : (
                  <div className="flex min-h-[60vh] flex-col">
                    <div className="border-b border-slate-200 p-4 sm:p-5 dark:border-slate-700">
                      {/* Team name + actions row */}
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                        <div className="flex min-w-0 items-center gap-3">
                          <div
                            className={cn(
                              "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-sm font-bold",
                              getGroupColor()
                            )}
                          >
                            {(activeGroup.name[0] ?? "T").toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                                {activeGroup.name}
                              </h3>
                              <span
                                className={cn(
                                  "rounded-full px-2.5 py-0.5 text-[10px] font-semibold capitalize",
                                  activeGroup.visibility === "public"
                                    ? "bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-300"
                                    : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400"
                                )}
                              >
                                {activeGroup.visibility}
                              </span>
                            </div>
                            {activeGroup.description && (
                              <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                                {activeGroup.description}
                              </p>
                            )}
                            {/* Member avatars */}
                            {activeMembers.length > 0 && (
                              <div className="mt-2.5 flex items-center gap-2">
                                <div className="flex -space-x-1.5">
                                  {activeMembers.slice(0, 4).map((m) => (
                                    <Avatar
                                      key={`header-member-${m.user_id}`}
                                      userId={m.user?.id}
                                      name={m.user?.name}
                                      firstName={m.user?.first_name}
                                      lastName={m.user?.last_name}
                                      src={m.user?.profile_image_url}
                                      href={
                                        m.user?.id
                                          ? `/profile/?id=${encodeURIComponent(m.user.id)}`
                                          : undefined
                                      }
                                      title={m.user?.name || "Researcher"}
                                      size={26}
                                      className="ring-2 ring-white dark:ring-slate-900"
                                    />
                                  ))}
                                </div>
                                <Button
                                  variant="link"
                                  size="sm"
                                  onClick={() => setAllMembersOpen(true)}
                                >
                                  {activeMembers.length} member
                                  {activeMembers.length !== 1 ? "s" : ""}
                                </Button>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Right-side actions */}
                        <div className="flex shrink-0 flex-wrap items-center gap-2">
                          {!canChat ? (
                            <Button
                              size="sm"
                              intent="primary"
                              onClick={() => {
                                void requestJoinMutation
                                  .mutateAsync(activeGroup.id)
                                  .then(() => setActionError(""))
                                  .catch((error) => {
                                    setActionError(
                                      toErrorMessage(
                                        error,
                                        "Could not submit join request."
                                      )
                                    );
                                  });
                              }}
                              disabled={
                                requestJoinMutation.isPending ||
                                activeGroup.visibility === "private"
                              }
                            >
                              {activeGroup.visibility === "private"
                                ? "Invite Only"
                                : requestJoinMutation.isPending
                                  ? "Requesting..."
                                  : "Request to Join"}
                            </Button>
                          ) : (
                            <>
                              {isAdmin && (
                                <Button
                                  size="sm"
                                  intent="primary"
                                  startIcon={
                                    <UserPlusIcon className="h-4 w-4" />
                                  }
                                  onClick={() => setInviteDialogOpen(true)}
                                >
                                  Invite
                                </Button>
                              )}
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={async () => {
                                  if (!resolvedActiveGroupId) return;
                                  await leaveGroupMutation
                                    .mutateAsync(resolvedActiveGroupId)
                                    .then(() => {
                                      setActionError("");
                                      setActiveGroupId(null);
                                    })
                                    .catch((error) => {
                                      setActionError(
                                        toErrorMessage(
                                          error,
                                          "Could not leave this team."
                                        )
                                      );
                                    });
                                }}
                                disabled={leaveGroupMutation.isPending}
                              >
                                Leave
                              </Button>
                              {isOwner && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  intent="danger"
                                  startIcon={<TrashIcon className="h-4 w-4" />}
                                  onClick={() => setDeleteTeamOpen(true)}
                                  disabled={deleteGroupMutation.isPending}
                                >
                                  Delete
                                </Button>
                              )}
                            </>
                          )}
                        </div>
                      </div>

                      {isAdmin && pendingMembers.length > 0 && (
                        <div className="mt-3 rounded-lg border border-slate-200 bg-slate-50/70 p-3 dark:border-slate-700 dark:bg-slate-900/40">
                          <p className="text-xs font-semibold tracking-wide text-slate-600 uppercase dark:text-slate-300">
                            Pending Requests ({pendingMembers.length})
                          </p>
                          <div className="mt-2 space-y-2">
                            {pendingMembers.map((m) => (
                              <div
                                key={`header-pending-${m.user_id}`}
                                className="flex items-center justify-between gap-2 rounded-md border border-slate-200 bg-white px-2 py-1.5 dark:border-slate-700 dark:bg-slate-900/60"
                              >
                                <div className="flex min-w-0 items-center gap-2">
                                  <Avatar
                                    userId={m.user?.id}
                                    name={m.user?.name}
                                    firstName={m.user?.first_name}
                                    lastName={m.user?.last_name}
                                    src={m.user?.profile_image_url}
                                    href={
                                      m.user?.id
                                        ? `/profile/?id=${encodeURIComponent(m.user.id)}`
                                        : undefined
                                    }
                                    title="View profile"
                                    size={20}
                                  />
                                  <p className="truncate text-xs font-medium text-slate-800 dark:text-slate-100">
                                    {m.user?.name || "Researcher"}
                                  </p>
                                </div>
                                <div className="flex items-center gap-1">
                                  <Button
                                    size="sm"
                                    intent="primary"
                                    onClick={() => {
                                      void approveMemberMutation.mutateAsync({
                                        groupId: m.group_id,
                                        userId: m.user_id,
                                      });
                                    }}
                                    disabled={approveMemberMutation.isPending}
                                  >
                                    Approve
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    intent="danger"
                                    onClick={() => {
                                      void declineMemberMutation.mutateAsync({
                                        groupId: m.group_id,
                                        userId: m.user_id,
                                      });
                                    }}
                                    disabled={declineMemberMutation.isPending}
                                  >
                                    Decline
                                  </Button>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      {actionError && (
                        <p className="mt-2 text-xs font-medium text-red-600 dark:text-red-400">
                          {actionError}
                        </p>
                      )}
                    </div>

                    {!canAccessTeamData ? (
                      <div className="flex min-h-[45vh] items-center justify-center p-6">
                        <div className="max-w-md rounded-xl border border-slate-200 bg-slate-50 p-5 text-center dark:border-slate-700 dark:bg-slate-900/40">
                          <p className="text-sm font-semibold text-slate-900 dark:text-white">
                            {activeGroup.visibility === "private"
                              ? "This team is private"
                              : "Join this team to view messages"}
                          </p>
                          <p className="mt-1 text-xs text-slate-600 dark:text-slate-300">
                            {activeGroup.visibility === "private"
                              ? "Ask an admin to invite you."
                              : "Once approved, you can read and post team messages."}
                          </p>
                        </div>
                      </div>
                    ) : (
                      <div className="flex min-h-0 flex-1 flex-col">
                        <div className="flex min-h-0 flex-1 flex-col">
                          <div className="border-b border-slate-200 p-4 dark:border-slate-700">
                            <TextArea
                              rows={2}
                              autoGrow
                              placeholder={
                                canChat
                                  ? "Post a message to this team..."
                                  : "Join this team to post"
                              }
                              value={newMessage}
                              onChange={(e) => setNewMessage(e.target.value)}
                              disabled={
                                !canChat || sendMessageMutation.isPending
                              }
                            />
                            <div className="mt-2 flex justify-end">
                              <div className="mr-auto flex items-center gap-2">
                                <AttachmentPickerButton
                                  onSelect={(file) => {
                                    setActionError("");
                                    setNewMessageFile(file);
                                  }}
                                  onError={(msg) => setActionError(msg)}
                                  disabled={
                                    !canChat || sendMessageMutation.isPending
                                  }
                                  title="Attach to team message"
                                />
                                {newMessageFile && (
                                  <AttachmentChip
                                    fileName={newMessageFile.name}
                                    contentType={newMessageFile.type}
                                    sizeBytes={newMessageFile.size}
                                    onRemove={() => setNewMessageFile(null)}
                                    className="max-w-full"
                                    maxNameClassName="max-w-44"
                                  />
                                )}
                              </div>
                              <Button
                                intent="primary"
                                onClick={() => {
                                  void handleSend();
                                }}
                                disabled={
                                  !canChat ||
                                  sendMessageMutation.isPending ||
                                  (!newMessage.trim() && !newMessageFile)
                                }
                              >
                                {sendMessageMutation.isPending
                                  ? "Posting..."
                                  : "Post"}
                              </Button>
                            </div>
                          </div>

                          <div className="flex-1 space-y-3 overflow-y-auto p-4">
                            {loadingMessages ? (
                              <p className="text-sm text-slate-500">
                                Loading messages...
                              </p>
                            ) : messages.length === 0 ? (
                              <p className="text-sm text-slate-500">
                                No messages yet.
                              </p>
                            ) : (
                              messages.map((m) => (
                                <TeamMessageCard
                                  key={m.id}
                                  groupId={resolvedActiveGroupId || ""}
                                  message={m}
                                  currentUserId={user?.id}
                                  isAdmin={isAdmin}
                                />
                              ))
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </section>
            </SidebarLayout>
          </>
        )}
      </div>

      <Dialog open={createTeamOpen} onOpenChange={setCreateTeamOpen}>
        <DialogContent className="max-w-lg border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900">
          <DialogHeader>
            <DialogTitle className="text-slate-900 dark:text-white">
              Create Team
            </DialogTitle>
            <DialogDescription className="text-slate-600 dark:text-slate-300">
              Create a public or private team for focused collaboration.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <InputField
              placeholder="Team name"
              value={newGroupName}
              onChange={(e) => setNewGroupName(e.target.value)}
            />
            <TextArea
              rows={3}
              placeholder="What is this team focused on?"
              value={newGroupDescription}
              onChange={(e) => setNewGroupDescription(e.target.value)}
            />
            <div className="space-y-1">
              <p className="text-xs font-medium text-slate-600 dark:text-slate-300">
                Team visibility
              </p>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setNewGroupVisibility("public")}
                  className={cn(
                    "rounded-lg border px-3 py-2 text-sm font-medium transition",
                    newGroupVisibility === "public"
                      ? "border-primary-600 bg-primary-600 text-white"
                      : "border-slate-300 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
                  )}
                >
                  Public
                </button>
                <button
                  type="button"
                  onClick={() => setNewGroupVisibility("private")}
                  className={cn(
                    "rounded-lg border px-3 py-2 text-sm font-medium transition",
                    newGroupVisibility === "private"
                      ? "border-primary-600 bg-primary-600 text-white"
                      : "border-slate-300 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
                  )}
                >
                  Private
                </button>
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => setCreateTeamOpen(false)}
              >
                Cancel
              </Button>
              <Button
                intent="primary"
                onClick={() => {
                  void handleCreateGroup().catch((error) => {
                    setActionError(
                      toErrorMessage(error, "Could not create team.")
                    );
                  });
                }}
                disabled={createGroupMutation.isPending || !newGroupName.trim()}
                startIcon={<PlusIcon className="h-4 w-4" />}
              >
                {createGroupMutation.isPending ? "Creating..." : "Create Team"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={inviteDialogOpen} onOpenChange={setInviteDialogOpen}>
        <DialogContent className="max-w-md border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900">
          <DialogHeader>
            <DialogTitle className="text-slate-900 dark:text-white">
              Invite to Team
            </DialogTitle>
            <DialogDescription className="text-slate-600 dark:text-slate-300">
              Enter the researcher email to add them directly to this team.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <InputField
              type="email"
              placeholder="researcher@university.edu"
              value={inviteEmailDraft}
              onChange={(e) => setInviteEmailDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  void handleInviteByEmail().catch((error) => {
                    setActionError(toErrorMessage(error, "Invite failed."));
                  });
                }
              }}
            />
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => setInviteDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button
                intent="primary"
                startIcon={<UserPlusIcon className="h-4 w-4" />}
                onClick={() => {
                  void handleInviteByEmail().catch((error) => {
                    setActionError(toErrorMessage(error, "Invite failed."));
                  });
                }}
                disabled={inviteMutation.isPending || !inviteEmailDraft.trim()}
              >
                {inviteMutation.isPending ? "Inviting..." : "Send Invite"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={allMembersOpen} onOpenChange={setAllMembersOpen}>
        <DialogContent className="max-w-lg border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900">
          <DialogHeader>
            <DialogTitle className="text-slate-900 dark:text-white">
              Team Members
            </DialogTitle>
            <DialogDescription className="text-slate-600 dark:text-slate-300">
              {activeMembers.length} active members in this team.
            </DialogDescription>
          </DialogHeader>
          <div className="max-h-[55vh] space-y-2 overflow-y-auto">
            {activeMembers.map((m) => (
              <div
                key={`member-list-${m.user_id}`}
                className="flex items-center justify-between rounded-lg border border-slate-200 px-3 py-2 dark:border-slate-700"
              >
                <div className="flex min-w-0 items-center gap-2">
                  <Avatar
                    userId={m.user?.id}
                    name={m.user?.name}
                    firstName={m.user?.first_name}
                    lastName={m.user?.last_name}
                    src={m.user?.profile_image_url}
                    href={
                      m.user?.id
                        ? `/profile/?id=${encodeURIComponent(m.user.id)}`
                        : undefined
                    }
                    title="View profile"
                    size={24}
                  />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-slate-900 dark:text-white">
                      {m.user?.name || "Researcher"}
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {m.role}
                    </p>
                  </div>
                </div>
                {isAdmin &&
                  m.user_id !== user?.id &&
                  (!isOwner ? m.role !== "owner" : true) && (
                    <Button
                      size="sm"
                      variant="outline"
                      intent="danger"
                      startIcon={<UserMinusIcon className="h-4 w-4" />}
                      onClick={() => {
                        if (!resolvedActiveGroupId) return;
                        void removeMemberMutation
                          .mutateAsync({
                            groupId: resolvedActiveGroupId,
                            userId: m.user_id,
                          })
                          .catch((error) => {
                            setActionError(
                              toErrorMessage(error, "Could not remove member.")
                            );
                          });
                      }}
                      disabled={removeMemberMutation.isPending}
                    >
                      Remove
                    </Button>
                  )}
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={deleteTeamOpen} onOpenChange={setDeleteTeamOpen}>
        <DialogContent className="max-w-md border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900">
          <DialogHeader>
            <DialogTitle className="text-slate-900 dark:text-white">
              Delete Team
            </DialogTitle>
            <DialogDescription className="text-slate-600 dark:text-slate-300">
              This will permanently delete the team, all messages, and
              memberships.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setDeleteTeamOpen(false)}>
              Cancel
            </Button>
            <Button
              intent="danger"
              startIcon={<TrashIcon className="h-4 w-4" />}
              onClick={() => {
                if (!resolvedActiveGroupId) return;
                void deleteGroupMutation
                  .mutateAsync(resolvedActiveGroupId)
                  .then(() => {
                    setDeleteTeamOpen(false);
                    setActiveGroupId(null);
                    setActionError("");
                  })
                  .catch((error) => {
                    setActionError(
                      toErrorMessage(error, "Could not delete team.")
                    );
                  });
              }}
              disabled={deleteGroupMutation.isPending}
            >
              {deleteGroupMutation.isPending ? "Deleting..." : "Delete Team"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
