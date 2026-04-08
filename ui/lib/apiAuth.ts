import { useAuthStore } from "@/store/useAuthStore";

/**
 * Returns headers with Bearer token for protected API calls.
 * Use for: profile update, wishlist, profile picture upload.
 */
export async function getAuthHeaders(): Promise<Record<string, string>> {
  const token = await useAuthStore.getState().getAccessToken();
  if (!token) return {};
  return { Authorization: `Bearer ${token}` };
}
