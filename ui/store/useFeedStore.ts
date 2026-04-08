import axios from "axios";
import {
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
    staleTime: 30 * 1000,
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
    staleTime: 30 * 1000,
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
    staleTime: 15 * 1000,
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
    staleTime: 30 * 1000,
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
    staleTime: 15 * 1000,
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
    staleTime: 30 * 1000,
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
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["feed", "posts"] });
    },
  });
}

export function useDeleteFeedPost() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (postId: string) => {
      const headers = await getAuthHeaders();
      await axios.delete(
        `${API_URL}/feed/posts/${encodeURIComponent(postId)}`,
        {
          headers,
        }
      );
      return postId;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["feed", "posts"] });
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
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["feed", "posts"] });
    },
  });
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
    onSuccess: ({ userId }) => {
      qc.invalidateQueries({ queryKey: ["feed", "posts"] });
      qc.invalidateQueries({ queryKey: ["feed", "likes", userId] });
      qc.invalidateQueries({ queryKey: ["feed", "dislikes", userId] });
      qc.invalidateQueries({ queryKey: ["feed", "post-likers"] });
    },
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
    onSuccess: ({ userId }) => {
      qc.invalidateQueries({ queryKey: ["feed", "posts"] });
      qc.invalidateQueries({ queryKey: ["feed", "likes", userId] });
      qc.invalidateQueries({ queryKey: ["feed", "dislikes", userId] });
      qc.invalidateQueries({ queryKey: ["feed", "post-likers"] });
    },
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
    onSuccess: ({ userId }) => {
      qc.invalidateQueries({ queryKey: ["feed", "posts"] });
      qc.invalidateQueries({ queryKey: ["feed", "likes", userId] });
      qc.invalidateQueries({ queryKey: ["feed", "dislikes", userId] });
      qc.invalidateQueries({ queryKey: ["feed", "post-likers"] });
    },
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
    onSuccess: ({ userId }) => {
      qc.invalidateQueries({ queryKey: ["feed", "posts"] });
      qc.invalidateQueries({ queryKey: ["feed", "likes", userId] });
      qc.invalidateQueries({ queryKey: ["feed", "dislikes", userId] });
      qc.invalidateQueries({ queryKey: ["feed", "post-likers"] });
    },
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
