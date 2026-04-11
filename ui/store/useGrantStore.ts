import axios from "axios";
import { useQuery } from "@tanstack/react-query";
import { create } from "zustand";
import { API_URL } from "../data/global";

/** Bulk list size — minimize Lambda invocations. */
const GRANTS_PAGE_SIZE_FETCH_ALL = 5000;
export const GRANTS_CACHE_TTL_MS = 15 * 60 * 1000;

/** Shape expected by GrantSummaryCard (cached catalog rows). */
export interface CachedGrant {
  id: string;
  title: string;
  agency_name: string;
  agency_code?: string;
  number: string;
  open_date: string;
  close_date: string;
  opp_status: string;
  inserted_at: string;
  updated_at: string;
}

function asGrantList(items: unknown[]): CachedGrant[] {
  return (items as (CachedGrant & { agency_code?: string })[]).map((g) => ({
    id: String(g.id),
    title: g.title ?? "",
    agency_name: g.agency_name ?? "",
    agency_code: g.agency_code,
    number: g.number ?? "",
    open_date: g.open_date ?? "",
    close_date: g.close_date ?? "",
    opp_status: g.opp_status ?? "",
    inserted_at: g.inserted_at ?? "",
    updated_at: g.updated_at ?? "",
  }));
}

// RAW API shape
interface CronSummary {
  id: string;
  created: string;
  posted_count: number;
  closed_count: number;
  archived_count: number;
  forecasted_count: number;
  last_7_days_count: number;
  last_4_weeks_count: number;
  category_agriculture: number;
  category_education: number;
  category_st: number;
  category_health: number;
  summary: string;
}

// Transformed UI Shape
interface GrantStats {
  total: number;
  active: number;
  closed: number;
  archived: number;
  forecasted: number;
  recent7Days: number;
  recent4Weeks: number;
  byCategory: {
    agriculture: number;
    education: number;
    scienceTech: number;
    health: number;
  };
}

// Fallback for the RAW API response (All Zeros)
const FALLBACK_API_RESPONSE: CronSummary = {
  id: "fallback",
  created: "",
  posted_count: 0,
  closed_count: 0,
  archived_count: 0,
  forecasted_count: 0,
  last_7_days_count: 0,
  last_4_weeks_count: 0,
  category_agriculture: 0,
  category_education: 0,
  category_st: 0,
  category_health: 0,
  summary: "",
};

export function useGrantCronStore() {
  return useQuery({
    queryKey: ["grants_cron"],
    queryFn: async () => {
      try {
        const { data } = await axios.get<CronSummary>(
          `${API_URL}/cron_summary`
        );
        return data;
      } catch (error) {
        console.error("API Error, using fallback:", error);
        return FALLBACK_API_RESPONSE;
      }
    },
    select: (data): GrantStats => ({
      total: data.posted_count + data.closed_count + data.archived_count,
      active: data.posted_count,
      closed: data.closed_count,
      archived: data.archived_count,
      forecasted: data.forecasted_count,
      recent7Days: data.last_7_days_count,
      recent4Weeks: data.last_4_weeks_count,
      byCategory: {
        agriculture: data.category_agriculture,
        education: data.category_education,
        scienceTech: data.category_st,
        health: data.category_health,
      },
    }),
    staleTime: 30 * 60 * 1000,
  });
}

/** Params for paginated grants list (server-side) */
export interface GrantsListParams {
  page: number;
  pageSize: number;
  search?: string;
  status?: string;
  agency?: string;
  openDateFrom?: string | null;
  openDateTo?: string | null;
  closeDateFrom?: string | null;
  closeDateTo?: string | null;
}

/** Paginated response from GET /grants */
export interface GrantsListResponse {
  items: unknown[];
  total: number;
  page: number;
  page_size: number;
}

export function usePaginatedGrants(
  params: GrantsListParams,
  options?: { enabled?: boolean }
) {
  const {
    page,
    pageSize,
    search,
    status,
    agency,
    openDateFrom,
    openDateTo,
    closeDateFrom,
    closeDateTo,
  } = params;
  return useQuery({
    enabled: options?.enabled ?? true,
    queryKey: [
      "grants",
      "paginated",
      page,
      pageSize,
      search ?? "",
      status ?? "",
      agency ?? "",
      openDateFrom ?? "",
      openDateTo ?? "",
      closeDateFrom ?? "",
      closeDateTo ?? "",
    ],
    queryFn: async () => {
      const sp = new URLSearchParams();
      sp.set("page", String(page));
      sp.set("page_size", String(pageSize));
      if (search?.trim()) sp.set("search", search.trim());
      if (status?.trim() && status !== "all") sp.set("status", status.trim());
      if (agency?.trim() && agency !== "all") sp.set("agency", agency.trim());
      if (openDateFrom) sp.set("open_date_from", openDateFrom);
      if (openDateTo) sp.set("open_date_to", openDateTo);
      if (closeDateFrom) sp.set("close_date_from", closeDateFrom);
      if (closeDateTo) sp.set("close_date_to", closeDateTo);
      const { data } = await axios.get<GrantsListResponse>(
        `${API_URL}/grants?${sp.toString()}`
      );
      return data;
    },
    staleTime: 60 * 1000,
  });
}

/** Fetch grants by ids (for AI search and recommended views) */
export function useGrantsByIds(ids: string[] | undefined) {
  return useQuery({
    queryKey: ["grants", "byIds", ids?.join(",") ?? ""],
    queryFn: async () => {
      if (!ids?.length) return [];
      const { data } = await axios.post<unknown[]>(`${API_URL}/grants`, {
        ids: ids.map((id) => parseInt(id, 10)).filter((n) => !Number.isNaN(n)),
      });
      return Array.isArray(data) ? data : [];
    },
    enabled: !!ids?.length,
    staleTime: 60 * 1000,
  });
}

/** Options for filter dropdowns (agencies, statuses) */
export function useGrantFilterOptions() {
  return useQuery({
    queryKey: ["grants", "options"],
    queryFn: async () => {
      const { data } = await axios.get<{
        agencies: string[];
        statuses: string[];
      }>(`${API_URL}/grants/options/filters`);
      return data;
    },
    staleTime: 30 * 60 * 1000,
  });
}

/** Legacy: first page of grants (e.g. for Hero/GrantPreview). Prefer usePaginatedGrants for list. */
export function useGrantStore() {
  return useQuery({
    queryKey: ["grants", "firstPage"],
    queryFn: async () => {
      const { data } = await axios.get<GrantsListResponse>(
        `${API_URL}/grants?page=1&page_size=24`
      );
      return "items" in data ? data.items : (data as unknown as unknown[]);
    },
    staleTime: 60 * 1000,
  });
}

interface GrantsCacheState {
  grants: CachedGrant[];
  isLoading: boolean;
  error: string | null;
  lastFetchedAt: number | null;
  fetchAll: (force?: boolean) => Promise<void>;
  reset: () => void;
}

let grantsFetchInFlight: Promise<void> | null = null;
let grantsFetchGate: Promise<void> = Promise.resolve();

function grantsCacheWarm(get: () => GrantsCacheState): boolean {
  const { lastFetchedAt, grants } = get();
  return (
    grants.length > 0 &&
    !!lastFetchedAt &&
    Date.now() - lastFetchedAt < GRANTS_CACHE_TTL_MS
  );
}

/** Full grants catalog — fetch once, filter client-side (Lambda-friendly). */
export const useGrantsCacheStore = create<GrantsCacheState>((set, get) => ({
  grants: [],
  isLoading: false,
  error: null,
  lastFetchedAt: null,

  reset: () =>
    set({ grants: [], isLoading: false, error: null, lastFetchedAt: null }),

  fetchAll: async (force = false) => {
    const prev = grantsFetchGate;
    let release!: () => void;
    grantsFetchGate = new Promise<void>((r) => {
      release = r;
    });
    await prev;
    try {
      if (grantsFetchInFlight) await grantsFetchInFlight;
      if (!force && grantsCacheWarm(get)) return;

      const run = async () => {
        set({ isLoading: true, error: null });
        try {
          const all: CachedGrant[] = [];
          let page = 1;
          let hasMore = true;
          let total = 0;
          while (hasMore) {
            const sp = new URLSearchParams();
            sp.set("page", String(page));
            sp.set("page_size", String(GRANTS_PAGE_SIZE_FETCH_ALL));
            // Only cache open grants — forecasted/closed/archived are fetched on demand
            sp.set("status", "posted");
            const { data } = await axios.get<GrantsListResponse>(
              `${API_URL}/grants?${sp.toString()}`
            );
            const items = asGrantList(data.items ?? []);
            total = data.total ?? items.length;
            all.push(...items);
            hasMore =
              all.length < total &&
              (data.items?.length ?? 0) === GRANTS_PAGE_SIZE_FETCH_ALL;
            page += 1;
          }
          set({ grants: all, lastFetchedAt: Date.now(), error: null });
        } catch (e) {
          const message =
            e instanceof Error ? e.message : "Failed to load grants";
          set({ error: message, grants: [] });
        } finally {
          set({ isLoading: false });
          grantsFetchInFlight = null;
        }
      };
      grantsFetchInFlight = run();
      await grantsFetchInFlight;
    } finally {
      release();
    }
  },
}));
