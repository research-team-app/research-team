import { API_URL } from "../data/global";
import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import { create } from "zustand";

/** Single request size for bulk user list (minimize Lambda invocations). */
const PAGE_SIZE_FETCH_ALL = 5000;
/** Skip refetch if cache is newer than this (ms). */
export const COLLABORATORS_CACHE_TTL_MS = 15 * 60 * 1000;

export interface AcademicStatus {
  open_to_collaboration?: boolean;
  seeking_phd_students?: boolean;
  accepting_interns?: boolean;
  looking_for_postdocs?: boolean;
  available_for_mentorship?: boolean;
}

export interface Collaborator {
  id: string;
  email: string;
  username: string;
  first_name: string;
  last_name: string;
  profile_image_url?: string;
  title?: string;
  institution?: string;
  department?: string;
  bio?: string;
  phone?: string;
  linkedin_url?: string;
  google_scholar_url?: string;
  orcid_id?: string;
  research_gate_url?: string;
  personal_website?: string;
  twitter_handle?: string;
  current_projects?: Array<{
    title: string;
    description: string;
    status: string;
  }>;
  academic_status?: AcademicStatus;
  research_interests?: string[];
  education?: Array<{
    degree: string;
    institution: string;
    year: number;
    field_of_study?: string;
  }>;
  grants?: unknown[];
  created_at?: string;
  updated_at?: string;
}

export interface CollaboratorsListParams {
  page: number;
  pageSize: number;
  search?: string;
}

export interface CollaboratorsListResponse {
  items: Collaborator[];
  total: number;
  page: number;
  page_size: number;
}

function normalizeUsersResponse(
  data: CollaboratorsListResponse | Collaborator[]
): CollaboratorsListResponse {
  if (Array.isArray(data)) {
    return { items: data, total: data.length, page: 1, page_size: data.length };
  }
  return data;
}

export function usePaginatedCollaborators(params: CollaboratorsListParams) {
  const { page, pageSize, search } = params;
  return useQuery({
    queryKey: ["collaborators", "paginated", page, pageSize, search ?? ""],
    queryFn: async () => {
      const sp = new URLSearchParams();
      sp.set("page", String(page));
      sp.set("page_size", String(pageSize));
      if (search?.trim()) sp.set("search", search.trim());
      const { data } = await axios.get<
        CollaboratorsListResponse | Collaborator[]
      >(`${API_URL}/users?${sp.toString()}`);
      return normalizeUsersResponse(data);
    },
    staleTime: 60 * 1000,
  });
}

/** Fetch collaborators by ids (e.g. AI search result ids) */
export function useCollaboratorsByIds(ids: string[] | undefined) {
  return useQuery({
    queryKey: ["collaborators", "byIds", ids?.join(",") ?? ""],
    queryFn: async () => {
      if (!ids?.length)
        return { items: [] as Collaborator[], total: 0, page: 1, page_size: 0 };
      const sp = new URLSearchParams({ ids: ids.join(",") });
      const { data } = await axios.get<
        CollaboratorsListResponse | Collaborator[]
      >(`${API_URL}/users?${sp.toString()}`);
      return normalizeUsersResponse(data);
    },
    enabled: !!ids?.length,
    staleTime: 60 * 1000,
  });
}

/** Zustand cache: all collaborators, fetched once to minimize Lambda calls. Search/filter is client-side. */
interface CollaboratorsCacheState {
  collaborators: Collaborator[];
  isLoading: boolean;
  error: string | null;
  lastFetchedAt: number | null;
  fetchAll: (force?: boolean) => Promise<void>;
  reset: () => void;
}

let collaboratorsFetchInFlight: Promise<void> | null = null;
/** Serialize fetchAll so parallel callers share one load (Lambda-friendly). */
let collaboratorsFetchGate: Promise<void> = Promise.resolve();

function collaboratorsCacheWarm(get: () => CollaboratorsCacheState): boolean {
  const { lastFetchedAt, collaborators } = get();
  return (
    collaborators.length > 0 &&
    !!lastFetchedAt &&
    Date.now() - lastFetchedAt < COLLABORATORS_CACHE_TTL_MS
  );
}

export const useCollaboratorsCacheStore = create<CollaboratorsCacheState>(
  (set, get) => ({
    collaborators: [],
    isLoading: false,
    error: null,
    lastFetchedAt: null,

    reset: () =>
      set({
        collaborators: [],
        isLoading: false,
        error: null,
        lastFetchedAt: null,
      }),

    fetchAll: async (force = false) => {
      const prev = collaboratorsFetchGate;
      let release!: () => void;
      collaboratorsFetchGate = new Promise<void>((r) => {
        release = r;
      });
      await prev;
      try {
        if (collaboratorsFetchInFlight) await collaboratorsFetchInFlight;
        if (!force && collaboratorsCacheWarm(get)) return;

        const run = async () => {
          set({ isLoading: true, error: null });
          try {
            const all: Collaborator[] = [];
            let page = 1;
            let hasMore = true;
            let total = 0;
            while (hasMore) {
              const sp = new URLSearchParams();
              sp.set("page", String(page));
              sp.set("page_size", String(PAGE_SIZE_FETCH_ALL));
              const { data } = await axios.get<
                CollaboratorsListResponse | Collaborator[]
              >(`${API_URL}/users?${sp.toString()}`);
              const normalized = normalizeUsersResponse(data);
              total = normalized.total;
              all.push(...normalized.items);
              hasMore =
                all.length < total &&
                normalized.items.length === PAGE_SIZE_FETCH_ALL;
              page += 1;
            }
            set({ collaborators: all, lastFetchedAt: Date.now(), error: null });
          } catch (e) {
            const message =
              e instanceof Error ? e.message : "Failed to load researchers";
            set({ error: message, collaborators: [] });
          } finally {
            set({ isLoading: false });
            collaboratorsFetchInFlight = null;
          }
        };
        collaboratorsFetchInFlight = run();
        await collaboratorsFetchInFlight;
      } finally {
        release();
      }
    },
  })
);
