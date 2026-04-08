import axios from "axios";
import { API_URL } from "@/data/global";
import type { AuthUser } from "@/store/useAuthStore";
import { getAuthHeaders } from "@/lib/apiAuth";

function buildUsernameBase(email?: string, username?: string): string {
  const source = (email?.split("@")[0] || username || "researcher").trim();
  const cleaned = source.replace(/[^a-zA-Z0-9_]/g, "").toLowerCase();
  return (cleaned || "researcher").slice(0, 20);
}

function randomSuffix(): string {
  return String(Math.floor(1000 + Math.random() * 9000));
}

export async function ensureUserProfile(user: AuthUser | null): Promise<void> {
  if (!user?.id) return;

  const userId = String(user.id).trim();
  if (!userId) return;

  const hasProfileById = async (): Promise<boolean> => {
    try {
      await axios.get(`${API_URL}/users/${encodeURIComponent(userId)}`);
      return true;
    } catch (e: unknown) {
      const status = (e as { response?: { status?: number } })?.response
        ?.status;
      // 404 = definitely no profile. Any other error (5xx, network) = treat as
      // "not found" so we attempt creation rather than throwing and aborting.
      return status !== 404 ? false : false;
    }
  };

  if (await hasProfileById()) return;

  const email = (user.attributes?.email || "").trim().toLowerCase();
  if (!email) {
    throw new Error("Authenticated user has no email; cannot create profile");
  }

  const firstName = (user.attributes?.given_name || "").trim() || "Research";
  const lastName = (user.attributes?.family_name || "").trim() || "User";
  const usernameBase = buildUsernameBase(email, user.username);

  const headers = await getAuthHeaders();
  if (!headers.Authorization) {
    throw new Error("Missing auth token; cannot create profile");
  }

  let lastError: unknown = null;
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const payload = {
      id: userId,
      username: `${usernameBase}${randomSuffix()}`,
      email,
      first_name: firstName,
      last_name: lastName,
    };

    try {
      await axios.post(`${API_URL}/users`, payload, { headers });
      // POST returned 2xx — profile was created or an existing record was found.
      return;
    } catch (e: unknown) {
      const status = (e as { response?: { status?: number } })?.response
        ?.status;
      const detail = (e as { response?: { data?: unknown } })?.response?.data;
      console.warn(
        `[ensureUserProfile] attempt ${attempt + 1} failed: status=${status}`,
        detail ?? e
      );
      lastError = e;
      if (status === 409) {
        continue;
      }
      if (status === 400) {
        if (await hasProfileById()) return;
        continue;
      }
      if (status != null && status >= 500) {
        continue;
      }
      throw e;
    }
  }

  throw lastError ?? new Error("Failed to create user profile");
}
