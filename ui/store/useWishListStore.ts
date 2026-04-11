import { create } from "zustand";
import axios from "axios";
import { API_URL } from "@/data/global";
import { getAuthHeaders } from "@/lib/apiAuth";
import { useToastStore } from "./useToastStore";

interface Grant {
  id: string;
  number: string;
  title: string;
  agency_name: string;
  opp_status: string;
  open_date: string;
  close_date: string;
  inserted_at: string;
  updated_at: string;
}

interface WishlistState {
  wishlistIds: string[];
  wishlistDetails: Grant[];
  isLoading: boolean;
  error: string | null;
  _idSet: Set<string>;

  reset: () => void;
  fetchWishlistIds: (userId: string) => Promise<void>;
  fetchWishlistDetails: (userId: string) => Promise<void>;

  addToWishlist: (userId: string, grantId: string) => Promise<void>;
  removeFromWishlist: (userId: string, grantId: string) => Promise<void>;

  isInWishlist: (grantId: string) => boolean;
}

export const useWishlistStore = create<WishlistState>((set, get) => ({
  wishlistIds: [],
  wishlistDetails: [],
  isLoading: false,
  error: null,
  _idSet: new Set<string>(),

  reset: () =>
    set({
      wishlistIds: [],
      wishlistDetails: [],
      isLoading: false,
      error: null,
      _idSet: new Set(),
    }),

  isInWishlist: (grantId) => get()._idSet.has(String(grantId)),

  fetchWishlistIds: async (userId) => {
    const uid = String(userId ?? "").trim();
    if (!uid) return;
    // If full details are already loaded, derive IDs from them — skip the Lambda call.
    const { wishlistDetails } = get();
    if (wishlistDetails.length > 0) {
      const ids = wishlistDetails.map((g) => String(g.id));
      set({ wishlistIds: ids, _idSet: new Set(ids) });
      return;
    }
    try {
      const headers = await getAuthHeaders();
      const { data } = await axios.get<{ wishlist_grant_ids: string[] }>(
        `${API_URL}/wishlist/${encodeURIComponent(uid)}`,
        { headers }
      );
      const ids = (data.wishlist_grant_ids || []).map(String);
      set({ wishlistIds: ids, _idSet: new Set(ids) });
    } catch (err) {
      console.error("Failed to load wishlist IDs", err);
      set({ wishlistIds: [] });
    }
  },

  fetchWishlistDetails: async (userId: string) => {
    const uid = String(userId ?? "").trim();
    if (!uid) {
      set({ wishlistDetails: [] });
      return;
    }
    set({ isLoading: true });
    try {
      const headers = await getAuthHeaders();
      const { data } = await axios.post<Grant[]>(
        `${API_URL}/wishlist-grants/${encodeURIComponent(uid)}`,
        {},
        { headers }
      );
      const list = Array.isArray(data) ? data : [];
      const details = list.map((g) => ({
        ...g,
        id: String(g.id),
        open_date: g.open_date ?? "",
        close_date: g.close_date ?? "",
        inserted_at: (g as Grant & { inserted_at?: string }).inserted_at ?? "",
        updated_at: (g as Grant & { updated_at?: string }).updated_at ?? "",
      }));
      // Keep IDs in sync so fetchWishlistIds can skip its own API call.
      const ids = details.map((g) => g.id);
      set({ wishlistDetails: details, wishlistIds: ids, _idSet: new Set(ids) });
    } catch (err) {
      console.error("Failed to load wishlist details", err);
      set({ error: "Could not load details", wishlistDetails: [] });
    } finally {
      set({ isLoading: false });
    }
  },

  addToWishlist: async (userId, grantId) => {
    const uid = String(userId ?? "").trim();
    if (!uid) {
      console.error("Wishlist: missing user id (sub); sign in again.");
      return;
    }
    const originalIds = get().wishlistIds;
    const id = String(grantId);
    const newIds = [...originalIds, id];
    set({ wishlistIds: newIds, _idSet: new Set(newIds) });

    try {
      const headers = await getAuthHeaders();
      await axios.post(
        `${API_URL}/wishlist`,
        { user_id: uid, grant_id: id },
        { headers }
      );
      // Show success toast
      useToastStore.getState().addToast("Grant added to saved grants", {
        variant: "success",
        position: "top-right",
        duration: 3000,
      });
    } catch (err) {
      set({ wishlistIds: originalIds, _idSet: new Set(originalIds) });
      console.error("Add to wishlist failed", err);
      useToastStore.getState().addToast("Failed to save grant", {
        variant: "error",
        position: "top-right",
        duration: 3000,
      });
    }
  },

  removeFromWishlist: async (userId, grantId) => {
    const uid = String(userId ?? "").trim();
    if (!uid) return;
    const originalIds = get().wishlistIds;
    const originalDetails = get().wishlistDetails;
    const id = String(grantId);
    const newIds = originalIds.filter((x) => x !== id);
    set({
      wishlistIds: newIds,
      _idSet: new Set(newIds),
      wishlistDetails: originalDetails.filter((g) => String(g.id) !== id),
    });

    try {
      const headers = await getAuthHeaders();
      await axios.delete(`${API_URL}/wishlist`, {
        data: { user_id: uid, grant_id: id },
        headers,
      });
      // Show success toast
      useToastStore.getState().addToast("Grant removed from saved grants", {
        variant: "info",
        position: "top-right",
        duration: 3000,
      });
    } catch (err) {
      set({
        wishlistIds: originalIds,
        _idSet: new Set(originalIds),
        wishlistDetails: originalDetails,
      });
      console.error("Remove from wishlist failed", err);
      useToastStore.getState().addToast("Failed to remove grant", {
        variant: "error",
        position: "top-right",
        duration: 3000,
      });
    }
  },
}));
