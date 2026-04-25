/**
 * Shared unread-message count so ChatDock and ProfileDropdown both read from
 * one fetch instead of each making their own GET /messages/unread-count call.
 */
import axios from "axios";
import { create } from "zustand";
import { API_URL } from "@/data/global";
import { getAuthHeaders } from "@/lib/apiAuth";

interface UnreadState {
  count: number;
  loading: boolean;
  fetch: (userId: string | undefined) => Promise<void>;
  decrement: () => void;
  reset: () => void;
}

export const useUnreadStore = create<UnreadState>((set, get) => ({
  count: 0,
  loading: false,

  fetch: async (userId) => {
    if (!userId || get().loading) return;
    set({ loading: true });
    try {
      const headers = await getAuthHeaders();
      const { data } = await axios.get<{ unread_count?: number }>(
        `${API_URL}/messages/unread-count`,
        { headers }
      );
      set({ count: Number(data?.unread_count ?? 0) });
    } catch {
      set({ count: 0 });
    } finally {
      set({ loading: false });
    }
  },

  decrement: () => set((s) => ({ count: Math.max(0, s.count - 1) })),
  reset: () => set({ count: 0 }),
}));
