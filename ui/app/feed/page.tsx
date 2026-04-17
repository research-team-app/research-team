"use client";

import { useMemo, useEffect, useRef, useState } from "react";
import {
  ArrowUpOnSquareIcon,
  ChatBubbleLeftRightIcon,
  FlagIcon,
  HandThumbDownIcon,
  HandThumbUpIcon,
  PaperAirplaneIcon,
  PencilSquareIcon,
  TrashIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
import PageHeader from "@/components/PageHeader";
import Avatar from "@/components/Avatar";
import Button from "@/components/ui/Button";
import TextArea from "@/components/ui/TextArea";
import Toast from "@/components/ui/Toast";
import Loading from "@/app/loading";
import Error from "@/app/error";
import { useAuthStore } from "@/store/useAuthStore";
import { useToastStore } from "@/store/useToastStore";
import { API_URL } from "@/data/global";
import AttachmentChip from "@/components/AttachmentChip";
import AttachmentPickerButton from "@/components/AttachmentPickerButton";
import {
  type FeedPost,
  useCreateFeedComment,
  useCreateFeedPost,
  useDeleteFeedComment,
  useDeleteFeedPost,
  useDislikeFeedPost,
  useFeedComments,
  useFollowingIds,
  useInfiniteFeedPosts,
  useLikeFeedPost,
  usePostLikers,
  useReportFeedPost,
  useUpdateFeedPost,
  useUndislikeFeedPost,
  useUnlikeFeedPost,
  useUserFeedDislikes,
  useUserFeedLikes,
} from "@/store/useFeedStore";

const PAGE_SIZE = 20;

function formatWhen(dateIso?: string): string {
  if (!dateIso) return "";
  const d = new Date(dateIso);
  return d.toLocaleString();
}

function PostCard({
  post,
  currentUserId,
  likedPostIds,
  dislikedPostIds,
  isFollowing,
}: {
  post: FeedPost;
  currentUserId?: string;
  likedPostIds: Set<string>;
  dislikedPostIds: Set<string>;
  isFollowing?: boolean;
}) {
  const [showComments, setShowComments] = useState(false);
  const [showLikers, setShowLikers] = useState(false);
  const [commentDraft, setCommentDraft] = useState("");
  const [replyTargetId, setReplyTargetId] = useState<string | null>(null);
  const [replyDraft, setReplyDraft] = useState("");
  const [isEditingPost, setIsEditingPost] = useState(false);
  const [editPostDraft, setEditPostDraft] = useState(post.content);
  const [showReportForm, setShowReportForm] = useState(false);
  const [reportReason, setReportReason] = useState("");
  const [reportSubmitted, setReportSubmitted] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [toast, setToast] = useState<{
    isOpen: boolean;
    message: string;
    variant: "success" | "error" | "info" | "warning";
  }>({ isOpen: false, message: "", variant: "info" });

  const { data: commentsData, isLoading: isCommentsLoading } = useFeedComments(
    showComments ? post.id : null,
    showComments
  );
  const { data: likersData, isLoading: isLikersLoading } = usePostLikers(
    showLikers ? post.id : null,
    showLikers
  );

  const { addToast } = useToastStore();

  const likeMutation = useLikeFeedPost();
  const unlikeMutation = useUnlikeFeedPost();
  const dislikeMutation = useDislikeFeedPost();
  const undislikeMutation = useUndislikeFeedPost();
  const createCommentMutation = useCreateFeedComment();
  const deleteCommentMutation = useDeleteFeedComment();
  const deletePostMutation = useDeleteFeedPost();
  const updatePostMutation = useUpdateFeedPost();
  const reportMutation = useReportFeedPost();

  const isLiked = likedPostIds.has(post.id);
  const isDisliked = dislikedPostIds.has(post.id);
  const isOwnPost = currentUserId && currentUserId === post.author?.id;
  const isDeletedAuthor = !post.author?.id;
  const displayedLikes = Math.max(0, post.likes_count ?? 0);
  const displayedDislikes = Math.max(0, post.dislikes_count ?? 0);
  const displayedComments = Math.max(0, post.comments_count ?? 0);
  const authorProfileHref = isDeletedAuthor
    ? undefined
    : `/profile?id=${encodeURIComponent(String(post.author?.id ?? ""))}`;

  const allComments = useMemo(
    () => commentsData?.items ?? [],
    [commentsData?.items]
  );
  const rootComments = useMemo(
    () => allComments.filter((c) => !c.parent_comment_id),
    [allComments]
  );
  const repliesByParent = useMemo(
    () =>
      allComments.reduce<Record<string, typeof allComments>>((acc, c) => {
        if (!c.parent_comment_id) return acc;
        if (!acc[c.parent_comment_id]) acc[c.parent_comment_id] = [];
        acc[c.parent_comment_id].push(c);
        return acc;
      }, {}),
    [allComments]
  );

  const handleLike = async () => {
    if (!currentUserId) return;
    setActionError(null);
    try {
      if (isLiked) {
        await unlikeMutation.mutateAsync({
          userId: currentUserId,
          postId: post.id,
        });
      } else {
        await likeMutation.mutateAsync({
          userId: currentUserId,
          postId: post.id,
        });
      }
    } catch (err: unknown) {
      const detail =
        (err as { response?: { data?: { detail?: string } } })?.response?.data
          ?.detail ?? "Unable to update like right now.";
      setActionError(detail);
    }
  };

  const handleDislike = async () => {
    if (!currentUserId) return;
    setActionError(null);
    try {
      if (isDisliked) {
        await undislikeMutation.mutateAsync({
          userId: currentUserId,
          postId: post.id,
        });
      } else {
        await dislikeMutation.mutateAsync({
          userId: currentUserId,
          postId: post.id,
        });
      }
    } catch (err: unknown) {
      const detail =
        (err as { response?: { data?: { detail?: string } } })?.response?.data
          ?.detail ?? "Unable to update dislike right now.";
      setActionError(detail);
    }
  };

  const handleAddComment = async () => {
    const content = commentDraft.trim();
    if (!content) return;
    setActionError(null);
    try {
      await createCommentMutation.mutateAsync({ postId: post.id, content });
      setCommentDraft("");
      setShowComments(true);
      setToast({
        isOpen: true,
        message: "Comment added successfully.",
        variant: "success",
      });
    } catch (err: unknown) {
      const detail =
        (err as { response?: { data?: { detail?: string } } })?.response?.data
          ?.detail ?? "Unable to add comment right now.";
      setActionError(detail);
    }
  };

  const handleDeletePost = async () => {
    if (!isOwnPost) return;
    await deletePostMutation.mutateAsync(post.id);
    addToast("Post deleted.", {
      variant: "success",
      position: "bottom-right",
      duration: 3000,
    });
  };

  const handleSavePostEdit = async () => {
    if (!isOwnPost) return;
    const content = editPostDraft.trim();
    if (!content) return;
    setActionError(null);
    try {
      await updatePostMutation.mutateAsync({ postId: post.id, content });
      setIsEditingPost(false);
    } catch (err: unknown) {
      const detail =
        (err as { response?: { data?: { detail?: string } } })?.response?.data
          ?.detail ?? "Unable to update post right now.";
      setActionError(detail);
    }
  };

  const handleAddReply = async (parentCommentId: string) => {
    const content = replyDraft.trim();
    if (!content) return;
    setActionError(null);
    try {
      await createCommentMutation.mutateAsync({
        postId: post.id,
        content,
        parentCommentId,
      });
      setReplyDraft("");
      setReplyTargetId(null);
      setToast({
        isOpen: true,
        message: "Reply added successfully.",
        variant: "success",
      });
    } catch (err: unknown) {
      const detail =
        (err as { response?: { data?: { detail?: string } } })?.response?.data
          ?.detail ?? "Unable to add reply right now.";
      setActionError(detail);
    }
  };

  const handleSharePost = async () => {
    const origin =
      typeof window !== "undefined" && window.location?.origin
        ? window.location.origin
        : "";
    const postLink = `${origin}/feed?post=${encodeURIComponent(post.id)}`;

    try {
      if (typeof navigator !== "undefined" && navigator.share) {
        await navigator.share({
          title: `Post by ${post.author?.name || "Researcher"}`,
          text: post.content.slice(0, 160),
          url: postLink,
        });
        setToast({
          isOpen: true,
          message: "Post shared.",
          variant: "success",
        });
        return;
      }

      if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(postLink);
        setToast({
          isOpen: true,
          message: "Post link copied.",
          variant: "success",
        });
        return;
      }

      setToast({
        isOpen: true,
        message: "Sharing is not available in this browser.",
        variant: "warning",
      });
    } catch {
      setToast({
        isOpen: true,
        message: "Could not share post right now.",
        variant: "error",
      });
    }
  };

  const handleReport = async () => {
    const reason = reportReason.trim();
    if (!reason || !currentUserId) return;
    try {
      await reportMutation.mutateAsync({ postId: post.id, reason });
      setReportSubmitted(true);
      setReportReason("");
      setTimeout(() => {
        setShowReportForm(false);
        setReportSubmitted(false);
      }, 2000);
    } catch {
      setActionError("Could not submit report. Try again.");
    }
  };

  return (
    <article
      id={`post-${post.id}`}
      className="relative overflow-hidden rounded-2xl border border-slate-200/90 bg-white/95 p-5 shadow-[0_1px_6px_rgba(15,23,42,0.06)] transition-all hover:-translate-y-0.5 hover:shadow-[0_10px_28px_rgba(15,23,42,0.12)] dark:border-slate-700/60 dark:bg-slate-800/95 dark:shadow-[0_1px_6px_rgba(0,0,0,0.28)] dark:hover:shadow-[0_10px_28px_rgba(0,0,0,0.42)]"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          <Avatar
            userId={isDeletedAuthor ? "" : String(post.author?.id ?? "")}
            href={authorProfileHref}
            title={isDeletedAuthor ? undefined : "View profile"}
            name={isDeletedAuthor ? "[Deleted User]" : post.author?.name}
            firstName={post.author?.first_name}
            lastName={post.author?.last_name}
            profileTitle={post.author?.title}
            src={isDeletedAuthor ? undefined : post.author?.profile_image_url}
            size={40}
            className={isDeletedAuthor ? "opacity-50" : "hover:opacity-90"}
            textClassName="text-xs font-semibold"
          />
          <div className="min-w-0">
            {isDeletedAuthor ? (
              <span className="block truncate text-sm font-semibold text-slate-400 italic dark:text-slate-500">
                [Deleted User]
              </span>
            ) : (
              <a
                href={authorProfileHref}
                className="hover:text-primary-700 dark:hover:text-primary-300 block truncate text-sm font-semibold text-slate-900 transition-colors hover:underline dark:text-slate-100"
                title="View profile"
              >
                {post.author?.name || "Researcher"}
              </a>
            )}
            <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[11px]">
              <span className="inline-flex max-w-full items-center rounded-full border border-slate-200 bg-slate-100 px-2 py-0.5 font-medium text-slate-700 dark:border-slate-700 dark:bg-slate-800/80 dark:text-slate-300">
                <span className="truncate">
                  {post.author?.title || "Community member"}
                </span>
              </span>
              {isFollowing && (
                <span className="border-primary-200 bg-primary-50 text-primary-700 dark:border-primary-800/40 dark:bg-primary-950/30 dark:text-primary-300 inline-flex items-center gap-1 rounded-full border px-2 py-0.5">
                  Following
                </span>
              )}
              <span className="text-slate-400 dark:text-slate-600">•</span>
              <time className="rounded-full bg-slate-100 px-2 py-0.5 text-slate-600 dark:bg-slate-800/80 dark:text-slate-400">
                {formatWhen(post.created_at)}
              </time>
            </div>
          </div>
        </div>

        {isOwnPost && (
          <div className="flex items-center gap-1">
            <Button
              size="sm"
              variant="outline"
              startIcon={<PencilSquareIcon className="h-4 w-4" />}
              onClick={() => {
                setIsEditingPost((prev) => !prev);
                setEditPostDraft(post.content);
              }}
              title="Edit post"
            >
              {isEditingPost ? "Editing" : "Edit"}
            </Button>
            <Button
              size="sm"
              variant="outline"
              intent="danger"
              onClick={handleDeletePost}
              title="Delete post"
            >
              <TrashIcon className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>

      {isEditingPost ? (
        <div className="mt-3 space-y-2">
          <TextArea
            value={editPostDraft}
            onChange={(e) => setEditPostDraft(e.target.value)}
            rows={4}
          />
          <div className="flex justify-end gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                setIsEditingPost(false);
                setEditPostDraft(post.content);
              }}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              intent="primary"
              onClick={handleSavePostEdit}
              disabled={updatePostMutation.isPending || !editPostDraft.trim()}
            >
              {updatePostMutation.isPending ? "Saving..." : "Save"}
            </Button>
          </div>
        </div>
      ) : (
        <>
          <p className="mt-3 text-sm leading-relaxed whitespace-pre-wrap text-slate-800 dark:text-slate-200">
            {post.content}
          </p>
          {post.attachment?.download_url && (
            <AttachmentChip
              fileName={post.attachment.file_name}
              contentType={post.attachment.content_type}
              sizeBytes={post.attachment.size_bytes}
              href={`${API_URL}${post.attachment.download_url}`}
              className="mt-3"
            />
          )}
        </>
      )}

      <div className="mt-4 flex items-center gap-1.5 border-t border-slate-200/80 pt-3.5 dark:border-slate-700/70">
        <button
          type="button"
          onClick={handleLike}
          disabled={
            !currentUserId ||
            likeMutation.isPending ||
            unlikeMutation.isPending ||
            dislikeMutation.isPending ||
            undislikeMutation.isPending
          }
          className={`inline-flex items-center gap-1.5 rounded-md border border-transparent px-3 py-1.5 text-xs font-semibold transition-colors disabled:opacity-50 ${
            isLiked
              ? "border-primary-200 bg-primary-50 text-primary-700 dark:border-primary-800/40 dark:bg-primary-950/30 dark:text-primary-400"
              : "text-slate-500 hover:border-slate-200 hover:bg-slate-50 hover:text-slate-700 dark:text-slate-400 dark:hover:border-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200"
          }`}
        >
          <HandThumbUpIcon className="h-4 w-4" />
          {displayedLikes > 0 && <span>{displayedLikes}</span>}
          <span>Like</span>
        </button>

        <button
          type="button"
          onClick={handleDislike}
          disabled={
            !currentUserId ||
            likeMutation.isPending ||
            unlikeMutation.isPending ||
            dislikeMutation.isPending ||
            undislikeMutation.isPending
          }
          className={`inline-flex items-center gap-1.5 rounded-md border border-transparent px-3 py-1.5 text-xs font-semibold transition-colors disabled:opacity-50 ${
            isDisliked
              ? "border-danger-200 bg-danger-50 text-danger-600 dark:border-danger-800/40 dark:bg-danger-950/30 dark:text-danger-400"
              : "text-slate-500 hover:border-slate-200 hover:bg-slate-50 hover:text-slate-700 dark:text-slate-400 dark:hover:border-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200"
          }`}
        >
          <HandThumbDownIcon className="h-4 w-4" />
          {displayedDislikes > 0 && <span>{displayedDislikes}</span>}
          <span>Dislike</span>
        </button>

        <button
          type="button"
          onClick={() => setShowComments((prev) => !prev)}
          className={`inline-flex items-center gap-1.5 rounded-md border border-transparent px-3 py-1.5 text-xs font-semibold transition-colors ${
            showComments
              ? "border-slate-200 bg-slate-100 text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
              : "text-slate-500 hover:border-slate-200 hover:bg-slate-50 hover:text-slate-700 dark:text-slate-400 dark:hover:border-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200"
          }`}
        >
          <ChatBubbleLeftRightIcon className="h-4 w-4" />
          {displayedComments > 0 && <span>{displayedComments}</span>}
          <span>Comment</span>
        </button>

        <button
          type="button"
          onClick={() => {
            void handleSharePost();
          }}
          className="ml-auto inline-flex items-center gap-1.5 rounded-md border border-transparent px-3 py-1.5 text-xs font-semibold text-slate-500 transition-colors hover:border-slate-200 hover:bg-slate-50 hover:text-slate-700 dark:text-slate-400 dark:hover:border-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200"
        >
          <ArrowUpOnSquareIcon className="h-4 w-4" />
          <span>Share</span>
        </button>

        {!isOwnPost && currentUserId && (
          <button
            type="button"
            onClick={() => {
              setShowReportForm((p) => !p);
              setReportSubmitted(false);
            }}
            className={`inline-flex items-center gap-1.5 rounded-md border border-transparent px-2.5 py-1.5 text-xs font-semibold transition-colors ${
              showReportForm
                ? "border-danger-200 bg-danger-50 text-danger-600 dark:border-danger-800/40 dark:bg-danger-950/30 dark:text-danger-400"
                : "hover:text-danger-500 text-slate-400 hover:border-slate-200 hover:bg-slate-50 dark:text-slate-600 dark:hover:border-slate-700 dark:hover:bg-slate-800"
            }`}
            title="Report post"
          >
            {showReportForm ? (
              <XMarkIcon className="h-4 w-4" />
            ) : (
              <FlagIcon className="h-4 w-4" />
            )}
          </button>
        )}
      </div>

      {showReportForm && (
        <div className="mt-3 rounded-lg border p-3 dark:bg-gray-950/50">
          {reportSubmitted ? (
            <p className="text-xs font-medium text-red-700 dark:text-red-300">
              Thanks — this post has been reported.
            </p>
          ) : (
            <div className="space-y-2">
              <p className="text-xs font-semibold text-red-700 dark:text-red-300">
                Report this post
              </p>
              <TextArea
                intent="danger"
                rows={2}
                placeholder="Briefly describe the issue (spam, harassment, misinformation…)"
                value={reportReason}
                onChange={(e) => setReportReason(e.target.value)}
              />
              <div className="flex justify-end gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setShowReportForm(false)}
                >
                  Cancel
                </Button>
                <Button
                  size="sm"
                  intent="danger"
                  onClick={() => {
                    void handleReport();
                  }}
                  loading={reportMutation.isPending}
                  disabled={!reportReason.trim() || reportMutation.isPending}
                >
                  Submit Report
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      {displayedLikes > 0 && (
        <div className="mt-1 px-1">
          <button
            type="button"
            className="hover:text-primary-600 dark:hover:text-primary-400 text-[11px] font-medium text-slate-400 dark:text-slate-500"
            onClick={() => setShowLikers((prev) => !prev)}
          >
            {displayedLikes}{" "}
            {displayedLikes === 1 ? "person liked this" : "people liked this"}
          </button>
        </div>
      )}

      {showLikers && (
        <div className="mt-4 space-y-2 border-t border-slate-200 pt-4 dark:border-slate-700">
          {isLikersLoading ? (
            <Loading mode="inline" size="sm" title="Loading likes..." />
          ) : likersData?.items?.length ? (
            <div className="flex flex-wrap gap-2">
              {likersData.items.map((liker) => (
                <a
                  key={`${liker.user_id}-${liker.liked_at ?? ""}`}
                  href={`/profile?id=${encodeURIComponent(String(liker.user_id ?? ""))}`}
                  className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800/60 dark:text-slate-200 dark:hover:bg-slate-700/70"
                >
                  <Avatar
                    userId={String(liker.user_id ?? "")}
                    name={liker.name}
                    firstName={liker.first_name}
                    lastName={liker.last_name}
                    profileTitle={liker.title}
                    src={liker.profile_image_url}
                    size={20}
                    textClassName="text-[10px] font-semibold"
                  />
                  <span>{liker.name || "Researcher"}</span>
                </a>
              ))}
            </div>
          ) : (
            <p className="text-xs text-slate-500 dark:text-slate-400">
              No likes yet.
            </p>
          )}
        </div>
      )}

      {showComments && (
        <div className="mt-4 space-y-3 border-t border-slate-200 pt-4 dark:border-slate-700">
          {actionError && (
            <p className="text-xs text-red-600 dark:text-red-400">
              {actionError}
            </p>
          )}
          {currentUserId ? (
            <div className="space-y-2">
              <TextArea
                placeholder="Write a comment..."
                value={commentDraft}
                onChange={(e) => setCommentDraft(e.target.value)}
                rows={3}
              />
              <div className="flex justify-end">
                <Button
                  size="sm"
                  intent="primary"
                  onClick={handleAddComment}
                  disabled={
                    createCommentMutation.isPending || !commentDraft.trim()
                  }
                >
                  Comment
                </Button>
              </div>
            </div>
          ) : (
            <p className="text-xs text-slate-600 dark:text-slate-400">
              Sign in to comment.
            </p>
          )}

          {isCommentsLoading ? (
            <Loading mode="inline" size="sm" title="Loading comments..." />
          ) : rootComments.length ? (
            <div className="space-y-2">
              {rootComments.map((comment) => {
                const ownComment =
                  currentUserId && comment.author?.id === currentUserId;
                const replies = repliesByParent[comment.id] ?? [];
                return (
                  <div
                    key={comment.id}
                    className="rounded-xl border border-slate-200 bg-slate-50/70 p-3 dark:border-slate-700 dark:bg-slate-800/50"
                  >
                    <div className="flex items-start gap-3">
                      <Avatar
                        userId={String(comment.author?.id ?? "")}
                        href={`/profile?id=${encodeURIComponent(String(comment.author?.id ?? ""))}`}
                        title="View profile"
                        name={comment.author?.name}
                        firstName={comment.author?.first_name}
                        lastName={comment.author?.last_name}
                        profileTitle={comment.author?.title}
                        src={comment.author?.profile_image_url}
                        size={28}
                        className="mt-0.5 hover:opacity-90"
                        textClassName="text-[10px] font-semibold"
                      />
                      <div className="min-w-0 flex-1">
                        <div className="mb-1 flex items-center justify-between gap-2">
                          <div className="min-w-0">
                            <a
                              href={`/profile?id=${encodeURIComponent(String(comment.author?.id ?? ""))}`}
                              className="truncate text-xs font-semibold text-slate-900 hover:underline dark:text-slate-100"
                            >
                              {comment.author?.name || "Researcher"}
                            </a>
                            <p className="text-[11px] text-slate-500 dark:text-slate-400">
                              {formatWhen(comment.created_at)}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            {ownComment && (
                              <Button
                                size="sm"
                                variant="outline"
                                intent="danger"
                                onClick={() =>
                                  deleteCommentMutation.mutate({
                                    commentId: comment.id,
                                    postId: post.id,
                                  })
                                }
                                title="Delete comment"
                              >
                                <TrashIcon className="h-3.5 w-3.5" />
                              </Button>
                            )}
                          </div>
                        </div>
                        <p className="text-sm whitespace-pre-wrap text-slate-800 dark:text-slate-200">
                          {comment.content}
                        </p>

                        <div className="mt-2">
                          <Button
                            variant="link"
                            size="sm"
                            onClick={() => {
                              setReplyTargetId((prev) =>
                                prev === comment.id ? null : comment.id
                              );
                              setReplyDraft("");
                            }}
                          >
                            Reply
                          </Button>
                        </div>

                        {replyTargetId === comment.id && currentUserId && (
                          <div className="mt-2 space-y-2 rounded-lg bg-white p-2 dark:bg-slate-900/70">
                            <TextArea
                              placeholder="Write a reply..."
                              value={replyDraft}
                              onChange={(e) => setReplyDraft(e.target.value)}
                              rows={2}
                            />
                            <div className="flex justify-end gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  setReplyTargetId(null);
                                  setReplyDraft("");
                                }}
                              >
                                Cancel
                              </Button>
                              <Button
                                size="sm"
                                intent="primary"
                                onClick={() => handleAddReply(comment.id)}
                                disabled={
                                  createCommentMutation.isPending ||
                                  !replyDraft.trim()
                                }
                              >
                                Reply
                              </Button>
                            </div>
                          </div>
                        )}

                        {replies.length > 0 && (
                          <div className="mt-3 space-y-2 border-l-2 border-slate-200 pl-3 dark:border-slate-700">
                            {replies.map((reply) => {
                              const ownReply =
                                currentUserId &&
                                reply.author?.id === currentUserId;
                              return (
                                <div
                                  key={reply.id}
                                  className="flex items-start gap-2"
                                >
                                  <Avatar
                                    userId={String(reply.author?.id ?? "")}
                                    href={`/profile?id=${encodeURIComponent(String(reply.author?.id ?? ""))}`}
                                    title="View profile"
                                    name={reply.author?.name}
                                    firstName={reply.author?.first_name}
                                    lastName={reply.author?.last_name}
                                    profileTitle={reply.author?.title}
                                    src={reply.author?.profile_image_url}
                                    size={24}
                                    className="mt-0.5 hover:opacity-90"
                                    fallbackClassName="bg-slate-300 text-slate-700 dark:bg-slate-600 dark:text-slate-100"
                                    textClassName="text-[9px] font-semibold"
                                  />
                                  <div className="min-w-0 flex-1 rounded-lg bg-white p-2.5 dark:bg-slate-900/70">
                                    <div className="mb-1 flex items-center justify-between gap-2">
                                      <a
                                        href={`/profile?id=${encodeURIComponent(String(reply.author?.id ?? ""))}`}
                                        className="text-xs font-semibold text-slate-900 hover:underline dark:text-slate-100"
                                      >
                                        {reply.author?.name || "Researcher"}
                                      </a>
                                      <div className="flex items-center gap-2">
                                        <p className="text-[11px] text-slate-500 dark:text-slate-400">
                                          {formatWhen(reply.created_at)}
                                        </p>
                                        {ownReply && (
                                          <Button
                                            size="sm"
                                            variant="outline"
                                            intent="danger"
                                            onClick={() =>
                                              deleteCommentMutation.mutate({
                                                commentId: reply.id,
                                                postId: post.id,
                                              })
                                            }
                                            title="Delete reply"
                                          >
                                            <TrashIcon className="h-3.5 w-3.5" />
                                          </Button>
                                        )}
                                      </div>
                                    </div>
                                    <p className="text-sm whitespace-pre-wrap text-slate-800 dark:text-slate-200">
                                      {reply.content}
                                    </p>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-xs text-slate-500 dark:text-slate-400">
              No comments yet.
            </p>
          )}
        </div>
      )}

      {toast.isOpen && (
        <Toast
          isOpen={toast.isOpen}
          onClose={() => setToast((t) => ({ ...t, isOpen: false }))}
          variant={toast.variant}
          position="bottom-right"
          duration={4000}
        >
          {toast.message}
        </Toast>
      )}
    </article>
  );
}

export default function FeedPage() {
  const { user } = useAuthStore();
  const [draft, setDraft] = useState("");
  const [draftFile, setDraftFile] = useState<File | null>(null);
  const [composerError, setComposerError] = useState<string | null>(null);
  const loadMoreRef = useRef<HTMLDivElement | null>(null);
  const hasScrolledToPost = useRef(false);
  const { data: followingIds = new Set<string>() } = useFollowingIds(user?.id);

  const {
    data,
    isLoading,
    isError,
    hasNextPage,
    fetchNextPage,
    isFetchingNextPage,
  } = useInfiniteFeedPosts(PAGE_SIZE);
  const { data: likesData } = useUserFeedLikes(user?.id);
  const { data: dislikesData } = useUserFeedDislikes(user?.id);
  const createPostMutation = useCreateFeedPost();

  const likedPostIds = useMemo(
    () => new Set((likesData?.post_ids ?? []).map(String)),
    [likesData?.post_ids]
  );
  const dislikedPostIds = useMemo(
    () => new Set((dislikesData?.post_ids ?? []).map(String)),
    [dislikesData?.post_ids]
  );

  const posts = useMemo(() => {
    const merged = data?.pages.flatMap((p) => p.items) ?? [];
    const seen = new Set<string>();
    const deduped = merged.filter((post) => {
      if (seen.has(post.id)) return false;
      seen.add(post.id);
      return true;
    });
    if (followingIds.size === 0) return deduped;
    // Stable sort: followed users' posts bubble to the top, time order preserved within each group
    return [...deduped].sort((a, b) => {
      const aF = followingIds.has(String(a.author?.id ?? ""));
      const bF = followingIds.has(String(b.author?.id ?? ""));
      if (aF && !bF) return -1;
      if (!aF && bF) return 1;
      return 0;
    });
  }, [data?.pages, followingIds]);

  const handleCreatePost = async () => {
    const content = draft.trim();
    if (!content && !draftFile) return;
    setComposerError(null);
    try {
      await createPostMutation.mutateAsync({ content, file: draftFile });
      setDraft("");
      setDraftFile(null);
    } catch {
      setComposerError("Failed to create post. Please try again.");
    }
  };

  useEffect(() => {
    if (typeof window === "undefined" || posts.length === 0) return;
    if (hasScrolledToPost.current) return;
    const params = new URLSearchParams(window.location.search);
    const postParam = params.get("post")?.trim();
    if (!postParam) return;
    const el = document.getElementById(`post-${postParam}`);
    if (!el) return;
    el.scrollIntoView({ behavior: "smooth", block: "center" });
    hasScrolledToPost.current = true;
  }, [posts]);

  useEffect(() => {
    const node = loadMoreRef.current;
    if (!node || !hasNextPage || isFetchingNextPage) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const [entry] = entries;
        if (entry?.isIntersecting && hasNextPage && !isFetchingNextPage) {
          fetchNextPage();
        }
      },
      { rootMargin: "300px 0px" }
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [fetchNextPage, hasNextPage, isFetchingNextPage]);

  if (isError) return <Error title="Error loading feed." />;

  return (
    <div className="min-h-screen px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-5xl">
        <PageHeader
          variant="feed"
          title="Community Feed"
          subtitle="Share ideas, ask questions, and connect with other researchers."
        />

        <div className="mb-6 overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-[0_2px_12px_rgba(15,23,42,0.05)] dark:border-slate-700/80 dark:bg-slate-800/80 dark:shadow-[0_2px_14px_rgba(0,0,0,0.25)]">
          <div className="h-0.5 bg-linear-to-r from-slate-400/50 via-slate-200/80 to-transparent dark:from-slate-500/70 dark:via-slate-600/80 dark:to-transparent" />

          {user ? (
            <div className="p-5 sm:p-6">
              <p className="mb-4 max-w-2xl text-sm leading-relaxed text-slate-600 dark:text-slate-400">
                Your post is visible to the community. Share updates, ask
                questions, or start a discussion, keep it respectful.
              </p>

              <TextArea
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                placeholder="What would you like to share?"
                rows={3}
                autoGrow
                className="bg-white dark:bg-slate-800"
              />

              {composerError && (
                <p className="mt-2 text-xs text-red-600 dark:text-red-400">
                  {composerError}
                </p>
              )}
              {draftFile && (
                <div className="mt-2">
                  <AttachmentChip
                    fileName={draftFile.name}
                    contentType={draftFile.type}
                    sizeBytes={draftFile.size}
                    onRemove={() => setDraftFile(null)}
                  />
                </div>
              )}

              <div className="mt-5 flex items-center justify-between border-t border-slate-100 pt-4 dark:border-slate-700/80">
                <AttachmentPickerButton
                  onSelect={(file) => {
                    setComposerError(null);
                    setDraftFile(file);
                  }}
                  onError={(msg) => setComposerError(msg)}
                  disabled={createPostMutation.isPending}
                  title="Add attachment"
                />
                <Button
                  intent="primary"
                  size="sm"
                  startIcon={<PaperAirplaneIcon className="h-3.5 w-3.5" />}
                  onClick={handleCreatePost}
                  loading={createPostMutation.isPending}
                  disabled={
                    createPostMutation.isPending ||
                    (!draft.trim() && !draftFile)
                  }
                >
                  Post
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-start justify-between gap-3 p-4 sm:flex-row sm:items-center sm:p-5">
              <p className="text-sm text-slate-600 dark:text-slate-400">
                Sign in to create posts, like, and comment.
              </p>
              <Button
                href="/login"
                intent="primary"
                variant="outline"
                size="sm"
              >
                Login to engage
              </Button>
            </div>
          )}
        </div>

        {isLoading && !data ? (
          <div className="border-border bg-muted/40 flex min-h-56 flex-col items-center justify-center rounded-2xl border py-16">
            <Loading mode="inline" title="Loading feed..." />
          </div>
        ) : posts.length === 0 ? (
          <div className="border-border bg-card rounded-xl border p-8 text-center">
            <p className="text-sm text-slate-600 dark:text-slate-400">
              No posts yet. Be the first to start the conversation.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {posts.map((post) => (
              <PostCard
                key={post.id}
                post={post}
                currentUserId={user?.id}
                likedPostIds={likedPostIds}
                dislikedPostIds={dislikedPostIds}
                isFollowing={
                  followingIds.size > 0 &&
                  post.author?.id !== user?.id &&
                  followingIds.has(String(post.author?.id ?? ""))
                }
              />
            ))}

            <div ref={loadMoreRef} className="h-1 w-full" aria-hidden="true" />

            {isFetchingNextPage && (
              <p className="py-2 text-center text-sm text-slate-500 dark:text-slate-400">
                Loading more posts...
              </p>
            )}

            {!hasNextPage && posts.length > 0 && (
              <p className="py-2 text-center text-sm text-slate-500 dark:text-slate-400">
                You’re all caught up.
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
