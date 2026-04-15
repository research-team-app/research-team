import axios from "axios";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { API_URL } from "@/data/global";
import { getAuthHeaders } from "@/lib/apiAuth";

export type GroupVisibility = "public" | "private";

export interface GroupItem {
  id: string;
  name: string;
  description: string;
  visibility: GroupVisibility;
  owner_id: string;
  created_at?: string;
  role?: "owner" | "admin" | "member";
  status?: "active" | "pending" | "invited";
  is_member?: boolean;
}

export interface GroupMessage {
  id: string;
  group_id: string;
  sender_id: string;
  content: string;
  attachment?: {
    file_name: string;
    content_type: string;
    size_bytes: number;
    download_url: string;
  } | null;
  created_at?: string;
  sender?: {
    id: string;
    name?: string;
    first_name?: string;
    last_name?: string;
    title?: string;
    profile_image_url?: string;
  };
}

export interface GroupMember {
  group_id: string;
  user_id: string;
  role: "owner" | "admin" | "member";
  status: "active" | "pending" | "invited";
  created_at?: string;
  user?: {
    id: string;
    name?: string;
    first_name?: string;
    last_name?: string;
    title?: string;
    profile_image_url?: string;
  };
}

export interface GroupMessageReply {
  id: string;
  group_id: string;
  message_id: string;
  parent_reply_id?: string | null;
  sender_id: string;
  content: string;
  created_at?: string;
  sender?: {
    id: string;
    name?: string;
    first_name?: string;
    last_name?: string;
    title?: string;
    profile_image_url?: string;
  };
}

type UseGroupsOptions = {
  mineOnly?: boolean;
  search?: string;
  publicOnly?: boolean;
};

export function useGroups(options: boolean | UseGroupsOptions = false) {
  const normalized: Required<UseGroupsOptions> =
    typeof options === "boolean"
      ? { mineOnly: options, search: "", publicOnly: false }
      : {
          mineOnly: !!options?.mineOnly,
          search: (options?.search ?? "").trim(),
          publicOnly: !!options?.publicOnly,
        };

  return useQuery({
    queryKey: [
      "groups",
      normalized.mineOnly ? "mine" : "all",
      normalized.publicOnly ? "public-only" : "visible",
      normalized.search,
    ],
    queryFn: async () => {
      const headers = await getAuthHeaders();
      const query = new URLSearchParams({
        mine_only: normalized.mineOnly ? "true" : "false",
        public_only: normalized.publicOnly ? "true" : "false",
      });
      if (normalized.search) {
        query.set("search", normalized.search);
      }
      const { data } = await axios.get<{ items?: GroupItem[] }>(
        `${API_URL}/groups?${query.toString()}`,
        { headers }
      );
      return Array.isArray(data?.items) ? data.items : [];
    },
    staleTime: 15 * 1000,
  });
}

export function useCreateGroup() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      name,
      description,
      visibility,
    }: {
      name: string;
      description?: string;
      visibility: GroupVisibility;
    }) => {
      const headers = await getAuthHeaders();
      const { data } = await axios.post<{ group: GroupItem }>(
        `${API_URL}/groups`,
        { name, description: description ?? "", visibility },
        { headers }
      );
      return data.group;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["groups"] });
    },
  });
}

export function useRequestJoinGroup() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (groupId: string) => {
      const headers = await getAuthHeaders();
      await axios.post(
        `${API_URL}/groups/${encodeURIComponent(groupId)}/join-request`,
        {},
        { headers }
      );
      return groupId;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["groups"] });
    },
  });
}

export function useInviteToGroup() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      groupId,
      userId,
      email,
    }: {
      groupId: string;
      userId?: string;
      email?: string;
    }) => {
      const headers = await getAuthHeaders();
      const payload: Record<string, string> = {};
      if ((userId ?? "").trim()) payload.user_id = (userId ?? "").trim();
      if ((email ?? "").trim()) payload.email = (email ?? "").trim();
      await axios.post(
        `${API_URL}/groups/${encodeURIComponent(groupId)}/invite`,
        payload,
        { headers }
      );
      return { groupId, userId, email };
    },
    onSuccess: ({ groupId }) => {
      qc.invalidateQueries({ queryKey: ["group-members", groupId] });
    },
  });
}

export function useApproveGroupMember() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      groupId,
      userId,
    }: {
      groupId: string;
      userId: string;
    }) => {
      const headers = await getAuthHeaders();
      await axios.post(
        `${API_URL}/groups/${encodeURIComponent(groupId)}/members/${encodeURIComponent(userId)}/approve`,
        {},
        { headers }
      );
      return { groupId, userId };
    },
    onSuccess: ({ groupId }) => {
      qc.invalidateQueries({ queryKey: ["group-members", groupId] });
      qc.invalidateQueries({ queryKey: ["groups"] });
    },
  });
}

export function useDeclineGroupMember() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      groupId,
      userId,
    }: {
      groupId: string;
      userId: string;
    }) => {
      const headers = await getAuthHeaders();
      await axios.post(
        `${API_URL}/groups/${encodeURIComponent(groupId)}/members/${encodeURIComponent(userId)}/decline`,
        {},
        { headers }
      );
      return { groupId, userId };
    },
    onSuccess: ({ groupId }) => {
      qc.invalidateQueries({ queryKey: ["group-members", groupId] });
      qc.invalidateQueries({ queryKey: ["groups"] });
    },
  });
}

export function useLeaveGroup() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (groupId: string) => {
      const headers = await getAuthHeaders();
      await axios.delete(
        `${API_URL}/groups/${encodeURIComponent(groupId)}/members/me`,
        {
          headers,
        }
      );
      return groupId;
    },
    onSuccess: (groupId) => {
      qc.invalidateQueries({ queryKey: ["groups"] });
      qc.invalidateQueries({ queryKey: ["group-members", groupId] });
      qc.invalidateQueries({ queryKey: ["group-messages", groupId] });
    },
  });
}

export function useRemoveGroupMember() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      groupId,
      userId,
    }: {
      groupId: string;
      userId: string;
    }) => {
      const headers = await getAuthHeaders();
      await axios.delete(
        `${API_URL}/groups/${encodeURIComponent(groupId)}/members/${encodeURIComponent(userId)}`,
        { headers }
      );
      return { groupId, userId };
    },
    onSuccess: ({ groupId }) => {
      qc.invalidateQueries({ queryKey: ["group-members", groupId] });
      qc.invalidateQueries({ queryKey: ["groups"] });
    },
  });
}

export function useDeleteGroup() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (groupId: string) => {
      const headers = await getAuthHeaders();
      await axios.delete(`${API_URL}/groups/${encodeURIComponent(groupId)}`, {
        headers,
      });
      return groupId;
    },
    onSuccess: (groupId) => {
      qc.invalidateQueries({ queryKey: ["groups"] });
      qc.invalidateQueries({ queryKey: ["group-members", groupId] });
      qc.invalidateQueries({ queryKey: ["group-messages", groupId] });
    },
  });
}

export function useGroupMembers(groupId: string | null) {
  return useQuery({
    queryKey: ["group-members", groupId ?? ""],
    queryFn: async () => {
      if (!groupId) return [] as GroupMember[];
      const headers = await getAuthHeaders();
      const { data } = await axios.get<{ items?: GroupMember[] }>(
        `${API_URL}/groups/${encodeURIComponent(groupId)}/members`,
        { headers }
      );
      return Array.isArray(data?.items) ? data.items : [];
    },
    enabled: !!groupId,
    staleTime: 10 * 1000,
  });
}

export function useGroupMessages(groupId: string | null) {
  return useQuery({
    queryKey: ["group-messages", groupId ?? ""],
    queryFn: async () => {
      if (!groupId) return [] as GroupMessage[];
      const headers = await getAuthHeaders();
      const { data } = await axios.get<{ items?: GroupMessage[] }>(
        `${API_URL}/groups/${encodeURIComponent(groupId)}/messages?limit=200`,
        { headers }
      );
      return Array.isArray(data?.items) ? data.items : [];
    },
    enabled: !!groupId,
    staleTime: 5 * 1000,
  });
}

export function useSendGroupMessage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      groupId,
      content,
      file,
    }: {
      groupId: string;
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
      const { data } = await axios.post<GroupMessage>(
        `${API_URL}/groups/${encodeURIComponent(groupId)}/messages`,
        body,
        {
          headers: hasFile
            ? headers
            : { ...headers, "Content-Type": "application/json" },
        }
      );
      return data;
    },
    onSuccess: (msg) => {
      qc.invalidateQueries({ queryKey: ["group-messages", msg.group_id] });
    },
  });
}

export function useDeleteGroupMessage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      groupId,
      messageId,
    }: {
      groupId: string;
      messageId: string;
    }) => {
      const headers = await getAuthHeaders();
      await axios.delete(
        `${API_URL}/groups/${encodeURIComponent(groupId)}/messages/${encodeURIComponent(messageId)}`,
        { headers }
      );
      return { groupId, messageId };
    },
    onSuccess: ({ groupId }) => {
      qc.invalidateQueries({ queryKey: ["group-messages", groupId] });
    },
  });
}

export function useUpdateGroupMessage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      groupId,
      messageId,
      content,
    }: {
      groupId: string;
      messageId: string;
      content: string;
    }) => {
      const headers = await getAuthHeaders();
      const { data } = await axios.patch<GroupMessage>(
        `${API_URL}/groups/${encodeURIComponent(groupId)}/messages/${encodeURIComponent(messageId)}`,
        { content },
        { headers }
      );
      return data;
    },
    onSuccess: (msg) => {
      qc.invalidateQueries({ queryKey: ["group-messages", msg.group_id] });
    },
  });
}

export function useGroupMessageReplies(
  groupId: string | null,
  messageId: string | null
) {
  return useQuery({
    queryKey: ["group-message-replies", groupId ?? "", messageId ?? ""],
    queryFn: async () => {
      if (!groupId || !messageId) return [] as GroupMessageReply[];
      const headers = await getAuthHeaders();
      const { data } = await axios.get<{ items?: GroupMessageReply[] }>(
        `${API_URL}/groups/${encodeURIComponent(groupId)}/messages/${encodeURIComponent(messageId)}/replies`,
        { headers }
      );
      return Array.isArray(data?.items) ? data.items : [];
    },
    enabled: !!groupId && !!messageId,
    staleTime: 5 * 1000,
  });
}

export function useCreateGroupMessageReply() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      groupId,
      messageId,
      content,
      parentReplyId,
    }: {
      groupId: string;
      messageId: string;
      content: string;
      parentReplyId?: string;
    }) => {
      const headers = await getAuthHeaders();
      const payload: Record<string, string> = { content };
      if ((parentReplyId ?? "").trim())
        payload.parent_reply_id = (parentReplyId ?? "").trim();
      const { data } = await axios.post<GroupMessageReply>(
        `${API_URL}/groups/${encodeURIComponent(groupId)}/messages/${encodeURIComponent(messageId)}/replies`,
        payload,
        { headers }
      );
      return data;
    },
    onSuccess: (reply) => {
      qc.invalidateQueries({
        queryKey: ["group-message-replies", reply.group_id, reply.message_id],
      });
      qc.invalidateQueries({ queryKey: ["group-messages", reply.group_id] });
    },
  });
}
