import axios from "axios";
import {
  type InfiniteData,
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { API_URL } from "@/data/global";
import { getAuthHeaders } from "@/lib/apiAuth";

export interface FeedAuthor {
  id: string;
  first_name?: string;
  last_name?: string;
  name?: string;
  title?: string;
  profile_image_url?: string;
}

export interface FeedPost {
  id: string;
  author: FeedAuthor;
  content: string;
  attachment?: {
    file_name: string;
    content_type: string;
    size_bytes: number;
    download_url: string;
  } | null;
  likes_count: number;
  dislikes_count: number;
  comments_count: number;
  created_at: string;
  updated_at?: string;
}

export interface FeedComment {
  id: string;
  post_id: string;
  parent_comment_id?: string | null;
  author: FeedAuthor;
  content: string;
  created_at: string;
  updated_at?: string;
}

export interface FeedLikeUser {
  user_id: string;
  name: string;
  first_name?: string;
  last_name?: string;
  title?: string;
  profile_image_url?: string;
  liked_at?: string;
}

interface FeedPostsResponse {
  items: FeedPost[];
  total: number;
  page: number;
  page_size: number;
}

type FeedContext = {
  previousInfinite: Array<
    [readonly unknown[], InfiniteData<FeedPostsResponse, number> | undefined]
  >;
  optimisticPostId?: string;
};

interface FeedCommentsResponse {
  items: FeedComment[];
  total: number;
}

interface UserLikesResponse {
  user_id: string;
  post_ids: string[];
}

interface UserDislikesResponse {
  user_id: string;
  post_ids: string[];
}

interface PostLikersResponse {
  post_id: string;
  items: FeedLikeUser[];
  total: number;
}

function prependPostToFeed(
  oldData: InfiniteData<FeedPostsResponse, number> | undefined,
  createdPost: FeedPost
): InfiniteData<FeedPostsResponse, number> | undefined {
  if (!oldData?.pages?.length) return oldData;
  const exists = oldData.pages.some((page) =>
    page.items.some((p) => p.id === createdPost.id)
  );
  if (exists) return oldData;
  const [first, ...rest] = oldData.pages;
  return {
    ...oldData,
    pages: [
      {
        ...first,
        items: [createdPost, ...first.items],
        total: (first.total ?? 0) + 1,
      },
      ...rest,
    ],
  };
}

function removePostFromFeed(
  oldData: InfiniteData<FeedPostsResponse, number> | undefined,
  postId: string
): InfiniteData<FeedPostsResponse, number> | undefined {
  if (!oldData?.pages?.length) return oldData;
  const removed = oldData.pages.some((page) =>
    page.items.some((p) => p.id === postId)
  );
  if (!removed) return oldData;

  const pages = oldData.pages.map((page) => {
    const filtered = page.items.filter((p) => p.id !== postId);
    return {
      ...page,
      items: filtered,
      total: Math.max(0, (page.total ?? 0) - 1),
    };
  });
  return { ...oldData, pages };
}

function updatePostInFeed(
  oldData: InfiniteData<FeedPostsResponse, number> | undefined,
  updatedPost: FeedPost
): InfiniteData<FeedPostsResponse, number> | undefined {
  if (!oldData?.pages?.length) return oldData;
  let changed = false;
  const pages = oldData.pages.map((page) => {
    const items = page.items.map((p) => {
      if (p.id !== updatedPost.id) return p;
      changed = true;
      return {
        ...p,
        ...updatedPost,
      };
    });
    return { ...page, items };
  });
  return changed ? { ...oldData, pages } : oldData;
}

function updateAllInfiniteFeedCaches(
  qc: ReturnType<typeof useQueryClient>,
  updater: (
    oldData: InfiniteData<FeedPostsResponse, number> | undefined
  ) => InfiniteData<FeedPostsResponse, number> | undefined
) {
  qc.setQueriesData(
    { queryKey: ["feed", "posts", "infinite"] },
    (oldData: InfiniteData<FeedPostsResponse, number> | undefined) =>
      updater(oldData)
  );
}

function refreshFeedCaches(qc: ReturnType<typeof useQueryClient>) {
  qc.invalidateQueries({ queryKey: ["feed", "posts"], refetchType: "all" });
  qc.refetchQueries({
    queryKey: ["feed", "posts", "infinite"],
    type: "active",
  });
}

export function useFeedPosts(page = 1, pageSize = 20) {
  return useQuery({
    queryKey: ["feed", "posts", page, pageSize],
    queryFn: async () => {
      const sp = new URLSearchParams();
      sp.set("page", String(page));
      sp.set("page_size", String(pageSize));
      const { data } = await axios.get<FeedPostsResponse>(
        `${API_URL}/feed/posts?${sp.toString()}`
      );
      return data;
    },
    staleTime: 2 * 60 * 1000,
  });
}

export function useInfiniteFeedPosts(pageSize = 20) {
  return useInfiniteQuery({
    queryKey: ["feed", "posts", "infinite", pageSize],
    initialPageParam: 1,
    queryFn: async ({ pageParam }) => {
      const sp = new URLSearchParams();
      sp.set("page", String(pageParam));
      sp.set("page_size", String(pageSize));
      const { data } = await axios.get<FeedPostsResponse>(
        `${API_URL}/feed/posts?${sp.toString()}`
      );
      return data;
    },
    getNextPageParam: (lastPage, allPages) => {
      const loaded = allPages.reduce(
        (sum, pageData) => sum + pageData.items.length,
        0
      );
      if (loaded >= lastPage.total) return undefined;
      return allPages.length + 1;
    },
    staleTime: 2 * 60 * 1000,
  });
}

export function useFeedComments(postId: string | null, enabled = false) {
  return useQuery({
    queryKey: ["feed", "comments", postId ?? ""],
    queryFn: async () => {
      if (!postId) return { items: [], total: 0 } as FeedCommentsResponse;
      const { data } = await axios.get<FeedCommentsResponse>(
        `${API_URL}/feed/comments/${encodeURIComponent(postId)}`
      );
      return data;
    },
    enabled: enabled && !!postId,
    staleTime: 2 * 60 * 1000,
  });
}

export function useUserFeedLikes(userId?: string) {
  return useQuery({
    queryKey: ["feed", "likes", userId ?? ""],
    queryFn: async () => {
      if (!userId) return { user_id: "", post_ids: [] } as UserLikesResponse;
      const headers = await getAuthHeaders();
      const { data } = await axios.get<UserLikesResponse>(
        `${API_URL}/feed/likes/${encodeURIComponent(userId)}`,
        { headers }
      );
      return data;
    },
    enabled: !!userId,
    staleTime: 5 * 60 * 1000,
  });
}

export function usePostLikers(postId: string | null, enabled = false) {
  return useQuery({
    queryKey: ["feed", "post-likers", postId ?? ""],
    queryFn: async () => {
      if (!postId) {
        return { post_id: "", items: [], total: 0 } as PostLikersResponse;
      }
      const { data } = await axios.get<PostLikersResponse>(
        `${API_URL}/feed/likes/post/${encodeURIComponent(postId)}`
      );
      return data;
    },
    enabled: enabled && !!postId,
    staleTime: 2 * 60 * 1000,
  });
}

export function useUserFeedDislikes(userId?: string) {
  return useQuery({
    queryKey: ["feed", "dislikes", userId ?? ""],
    queryFn: async () => {
      if (!userId) return { user_id: "", post_ids: [] } as UserDislikesResponse;
      const headers = await getAuthHeaders();
      const { data } = await axios.get<UserDislikesResponse>(
        `${API_URL}/feed/dislikes/${encodeURIComponent(userId)}`,
        { headers }
      );
      return data;
    },
    enabled: !!userId,
    staleTime: 5 * 60 * 1000,
  });
}

export function useCreateFeedPost() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      content,
      file,
    }: {
      content: string;
      file?: File | null;
    }) => {
      const headers = await getAuthHeaders();
      const hasFile = file instanceof File;
      const body = hasFile
        ? (() => {
            const form = new FormData();
            form.append("content", content);
            form.append("file", file);
            return form;
          })()
        : { content };
      const { data } = await axios.post<FeedPost>(
        `${API_URL}/feed/posts`,
        body,
        {
          headers: hasFile
            ? headers
            : { ...headers, "Content-Type": "application/json" },
        }
      );
      return data;
    },
    onMutate: async (variables): Promise<FeedContext> => {
      await qc.cancelQueries({ queryKey: ["feed", "posts"] });
      const previousInfinite = qc.getQueriesData<
        InfiniteData<FeedPostsResponse, number> | undefined
      >({
        queryKey: ["feed", "posts", "infinite"],
      });

      const optimisticPostId = `temp-${Date.now()}`;
      const optimisticPost: FeedPost = {
        id: optimisticPostId,
        author: {
          id: "me",
          name: "You",
        },
        content: variables.content,
        likes_count: 0,
        dislikes_count: 0,
        comments_count: 0,
        attachment: null,
        created_at: new Date().toISOString(),
      };

      updateAllInfiniteFeedCaches(qc, (oldData) =>
        prependPostToFeed(oldData, optimisticPost)
      );

      return { previousInfinite, optimisticPostId };
    },
    onSuccess: (createdPost, _variables, context) => {
      updateAllInfiniteFeedCaches(qc, (oldData) =>
        prependPostToFeed(
          removePostFromFeed(oldData, context?.optimisticPostId ?? ""),
          createdPost
        )
      );
    },
    onError: (_error, _variables, context) => {
      context?.previousInfinite?.forEach(([queryKey, snapshot]) => {
        qc.setQueryData(queryKey, snapshot);
      });
    },
    onSettled: () => {
      refreshFeedCaches(qc);
    },
  });
}

export function useDeleteFeedPost() {
  const qc = useQueryClient();
  return useMutation({
    onMutate: async (postId): Promise<FeedContext> => {
      await qc.cancelQueries({ queryKey: ["feed", "posts"] });
      const previousInfinite = qc.getQueriesData<
        InfiniteData<FeedPostsResponse, number> | undefined
      >({
        queryKey: ["feed", "posts", "infinite"],
      });
      updateAllInfiniteFeedCaches(qc, (oldData) =>
        removePostFromFeed(oldData, postId)
      );
      return { previousInfinite };
    },
    mutationFn: async (postId: string) => {
      const headers = await getAuthHeaders();
      try {
        await axios.delete(
          `${API_URL}/feed/posts/${encodeURIComponent(postId)}`,
          {
            headers,
          }
        );
      } catch (error) {
        if (axios.isAxiosError(error) && error.response?.status === 404) {
          // Treat stale already-deleted posts as success.
          return postId;
        }
        throw error;
      }
      return postId;
    },
    onSuccess: (postId) => {
      updateAllInfiniteFeedCaches(qc, (oldData) =>
        removePostFromFeed(oldData, postId)
      );
    },
    onError: (_error, _postId, context) => {
      context?.previousInfinite?.forEach(([queryKey, snapshot]) => {
        qc.setQueryData(queryKey, snapshot);
      });
    },
    onSettled: () => {
      refreshFeedCaches(qc);
    },
  });
}

export function useUpdateFeedPost() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      postId,
      content,
    }: {
      postId: string;
      content: string;
    }) => {
      const headers = await getAuthHeaders();
      const { data } = await axios.patch<FeedPost>(
        `${API_URL}/feed/posts/${encodeURIComponent(postId)}`,
        { content },
        { headers }
      );
      return data;
    },
    onSuccess: (updatedPost) => {
      updateAllInfiniteFeedCaches(qc, (oldData) =>
        updatePostInFeed(oldData, updatedPost)
      );
    },
    onSettled: () => {
      refreshFeedCaches(qc);
    },
  });
}

function invalidateLikeQueries(
  qc: ReturnType<typeof useQueryClient>,
  userId: string
) {
  qc.invalidateQueries({ queryKey: ["feed", "posts"] });
  qc.invalidateQueries({ queryKey: ["feed", "likes", userId] });
  qc.invalidateQueries({ queryKey: ["feed", "dislikes", userId] });
  qc.invalidateQueries({ queryKey: ["feed", "post-likers"] });
}

export function useLikeFeedPost() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      userId,
      postId,
    }: {
      userId: string;
      postId: string;
    }) => {
      const headers = await getAuthHeaders();
      await axios.post(
        `${API_URL}/feed/likes`,
        { user_id: userId, post_id: postId },
        { headers }
      );
      return { userId, postId };
    },
    onSuccess: ({ userId }) => invalidateLikeQueries(qc, userId),
  });
}

export function useUnlikeFeedPost() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      userId,
      postId,
    }: {
      userId: string;
      postId: string;
    }) => {
      const headers = await getAuthHeaders();
      await axios.delete(`${API_URL}/feed/likes`, {
        data: { user_id: userId, post_id: postId },
        headers,
      });
      return { userId, postId };
    },
    onSuccess: ({ userId }) => invalidateLikeQueries(qc, userId),
  });
}

export function useDislikeFeedPost() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      userId,
      postId,
    }: {
      userId: string;
      postId: string;
    }) => {
      const headers = await getAuthHeaders();
      await axios.post(
        `${API_URL}/feed/dislikes`,
        { user_id: userId, post_id: postId },
        { headers }
      );
      return { userId, postId };
    },
    onSuccess: ({ userId }) => invalidateLikeQueries(qc, userId),
  });
}

export function useUndislikeFeedPost() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      userId,
      postId,
    }: {
      userId: string;
      postId: string;
    }) => {
      const headers = await getAuthHeaders();
      await axios.delete(`${API_URL}/feed/dislikes`, {
        data: { user_id: userId, post_id: postId },
        headers,
      });
      return { userId, postId };
    },
    onSuccess: ({ userId }) => invalidateLikeQueries(qc, userId),
  });
}

export function useCreateFeedComment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      postId,
      content,
      parentCommentId,
    }: {
      postId: string;
      content: string;
      parentCommentId?: string | null;
    }) => {
      const headers = await getAuthHeaders();
      const { data } = await axios.post<FeedComment>(
        `${API_URL}/feed/comments`,
        {
          post_id: postId,
          content,
          parent_comment_id: parentCommentId ?? null,
        },
        { headers }
      );
      return data;
    },
    onSuccess: (comment) => {
      qc.invalidateQueries({ queryKey: ["feed", "posts"] });
      qc.invalidateQueries({ queryKey: ["feed", "comments", comment.post_id] });
    },
  });
}

export function useDeleteFeedComment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      commentId,
      postId,
    }: {
      commentId: string;
      postId: string;
    }) => {
      const headers = await getAuthHeaders();
      await axios.delete(
        `${API_URL}/feed/comments/${encodeURIComponent(commentId)}`,
        {
          headers,
        }
      );
      return { commentId, postId };
    },
    onSuccess: ({ postId }) => {
      qc.invalidateQueries({ queryKey: ["feed", "posts"] });
      qc.invalidateQueries({ queryKey: ["feed", "comments", postId] });
    },
  });
}

export function useFollowingIds(userId?: string) {
  return useQuery({
    queryKey: ["follows", "following-ids", userId ?? ""],
    queryFn: async () => {
      if (!userId) return new Set<string>();
      const { data } = await axios.get<
        { id: string }[] | { users: { id: string }[] }
      >(`${API_URL}/follows/${userId}/following`);
      const users: { id: string }[] = Array.isArray(data)
        ? data
        : (data.users ?? []);
      return new Set(users.map((u) => String(u.id)));
    },
    enabled: !!userId,
    staleTime: 2 * 60 * 1000,
  });
}

export function useReportFeedPost() {
  return useMutation({
    mutationFn: async ({
      postId,
      reason,
    }: {
      postId: string;
      reason: string;
    }) => {
      const headers = await getAuthHeaders();
      const { data } = await axios.post(
        `${API_URL}/feed/posts/${postId}/report`,
        { reason },
        { headers }
      );
      return data;
    },
  });
}
