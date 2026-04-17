"use client";

import React, { useState, useMemo, useEffect } from "react";
import { isAfter, isBefore, isValid, parseISO } from "date-fns";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import {
  CalendarIcon,
  BuildingOfficeIcon,
  MagnifyingGlassIcon,
  CheckBadgeIcon,
  SparklesIcon,
  ListBulletIcon,
  ArrowRightOnRectangleIcon,
  UserCircleIcon,
} from "@heroicons/react/24/outline";
import { Slider } from "@/components/ui/Slider";
import SidebarLayout from "@/components/SidebarLayout";
import axios from "axios";

// Store & Utils
import {
  useGrantsCacheStore,
  useGrantsByIds,
  usePaginatedGrants,
} from "@/store/useGrantStore";
import { useMatchingGrants } from "@/store/useProfileStore";
import { useAuthStore } from "@/store/useAuthStore";
import { useWishlistStore } from "@/store/useWishListStore";
import { API_URL } from "@/data/global";

// Components
import GrantSummaryCard, { Grant } from "@/components/GrantSummaryCard";
import PageHeader from "@/components/PageHeader";
import InputField from "@/components/ui/InputField";
import Button from "@/components/ui/Button";
import DiscoverySearchPanel, {
  ResultLimitRow,
} from "@/components/DiscoverySearchPanel";
import { ComboboxFilter } from "@/components/ui/Combobox";
import Pagination from "@/components/Pagination";
import Error from "@/app/error";
import Loading from "../loading";
import { HiX } from "react-icons/hi";

// --- Types ---
type ViewMode = "all" | "ai" | "recommended";
const ITEMS_PER_PAGE = 30;
const GRANTS_UI_STATE_KEY = "grants-ui-state-v1";
const DEFAULT_RESULT_LIMIT = 25;

interface FilterState {
  searchTerm: string;
  agencyFilter: string;
  departmentFilter: string;
  statusFilter: string;
  startDate: Date | null;
  endDate: Date | null;
}

function normalizeGrantStatus(value: string | null | undefined): string {
  const raw = value?.toLowerCase().trim() ?? "";
  if (raw.includes("forecast") || raw.includes("forcast")) return "forecasted";
  if (raw === "posted" || raw === "open") return "posted";
  if (raw === "closed") return "closed";
  if (raw === "archived") return "archived";
  return raw;
}

/** "posted" and "open" are the same status and are the default — neither triggers Clear Filters. */
function isDefaultStatus(s: string) {
  return s === "posted" || s === "open";
}

function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState(value);
  useEffect(() => {
    const handler = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(handler);
  }, [value, delay]);
  return debouncedValue;
}

/** Display status: trust opp_status from DB; only override to "closed" when close_date has passed. */
function getGrantDisplayStatus(grant: Grant): string {
  const normalizedStatus = normalizeGrantStatus(grant.opp_status);

  // Trust the database status (kept in sync by the cron job).
  if (normalizedStatus === "forecasted") return "forecasted";
  if (normalizedStatus === "archived") return "archived";
  if (normalizedStatus === "closed") return "closed";

  // If close_date has passed and status is still posted, show as closed.
  if (grant.close_date) {
    const parsed = parseISO(grant.close_date);
    if (isValid(parsed) && parsed <= new Date()) return "closed";
  }

  return "posted";
}

function statusFilterLabel(value: string): string {
  const v = normalizeGrantStatus(value);
  if (v === "posted" || v === "open") return "Open";
  if (v === "forecasted") return "Forecasted";
  if (v === "closed") return "Closed";
  if (v === "archived") return "Archived";
  return value;
}

const INITIAL_FILTERS: FilterState = {
  searchTerm: "",
  agencyFilter: "all",
  departmentFilter: "all",
  statusFilter: "posted",
  startDate: null,
  endDate: null,
};

const STATUS_ORDER = ["posted", "forecasted", "closed", "archived"] as const;

const useGrantFilters = (
  grants: Grant[],
  viewMode: ViewMode,
  aiResultIds: string[] | null,
  filters: FilterState,
  setFilters: React.Dispatch<React.SetStateAction<FilterState>>
) => {
  const debouncedSearch = useDebounce(filters.searchTerm, 300);

  // Derive unique options for dropdowns (use display status so future close_date shows as Open)
  const options = useMemo(() => {
    if (!grants.length) return { agencies: [], departments: [], statuses: [] };
    const agencies = Array.from(new Set(grants.map((g) => g.agency_name)))
      .filter(Boolean)
      .sort();
    const departments = Array.from(
      new Set(
        grants
          .map((g) => g.agency_code)
          .filter((code): code is string => Boolean(code))
      )
    ).sort();

    const discovered = Array.from(
      new Set(grants.map((g) => getGrantDisplayStatus(g)).filter(Boolean))
    );
    const merged = Array.from(new Set([...STATUS_ORDER, ...discovered]));
    const statuses = merged.sort((a, b) => {
      const ai = STATUS_ORDER.indexOf(a as (typeof STATUS_ORDER)[number]);
      const bi = STATUS_ORDER.indexOf(b as (typeof STATUS_ORDER)[number]);
      const ax = ai === -1 ? Number.MAX_SAFE_INTEGER : ai;
      const bx = bi === -1 ? Number.MAX_SAFE_INTEGER : bi;
      if (ax !== bx) return ax - bx;
      return a.localeCompare(b);
    });

    return { agencies, departments, statuses };
  }, [grants]);

  const filteredGrants = useMemo(() => {
    if (!grants) return [];

    return grants.filter((grant) => {
      if (viewMode === "ai" && aiResultIds !== null) {
        if (!aiResultIds.includes(String(grant.id))) return false;
      }

      if (viewMode !== "ai" && debouncedSearch) {
        const tokens = debouncedSearch
          .toLowerCase()
          .split(/\s+/)
          .map((t) => t.trim())
          .filter(Boolean);

        const searchableText = [
          grant.title,
          grant.agency_name,
          grant.number,
          grant.agency_code,
          String(grant.id),
          grant.opp_status,
          (grant as Grant & { description?: string }).description,
          (grant as Grant & { summary?: string }).summary,
        ]
          .filter((v): v is string => !!v)
          .join(" ")
          .toLowerCase();

        const matchesSearch =
          tokens.length === 0 ||
          tokens.every((token) => searchableText.includes(token));
        if (!matchesSearch) return false;
      }

      // 3. Categorical Filters
      if (
        filters.agencyFilter !== "all" &&
        grant.agency_name !== filters.agencyFilter
      )
        return false;
      if (
        filters.departmentFilter !== "all" &&
        (grant.agency_code ?? "") !== filters.departmentFilter
      )
        return false;
      if (
        filters.statusFilter !== "all" &&
        getGrantDisplayStatus(grant) !==
          normalizeGrantStatus(filters.statusFilter)
      )
        return false;
      // 4. Date Range
      if (
        filters.startDate &&
        grant.open_date &&
        isBefore(parseISO(grant.open_date), filters.startDate)
      )
        return false;
      if (
        filters.endDate &&
        grant.close_date &&
        isAfter(parseISO(grant.close_date), filters.endDate)
      )
        return false;

      return true;
    });
  }, [grants, debouncedSearch, filters, viewMode, aiResultIds]);

  const updateFilter = (
    key: keyof FilterState,
    value: FilterState[keyof FilterState]
  ) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  const resetFilters = () => {
    setFilters({ ...INITIAL_FILTERS });
  };

  return {
    filters,
    updateFilter,
    resetFilters,
    options,
    filteredGrants,
    totalCount: filteredGrants.length,
  };
};

const EMPTY_IDS: string[] = [];

const GrantsExplorer = () => {
  const { user } = useAuthStore();
  const { fetchWishlistIds, addToWishlist, removeFromWishlist, isInWishlist } =
    useWishlistStore();

  const {
    data: matchingGrantIds = EMPTY_IDS,
    isLoading: isSuggestedLoading,
    isFetched: isSuggestedFetched,
  } = useMatchingGrants(user?.id);

  // Load wishlist when user logs in
  useEffect(() => {
    if (user?.id) fetchWishlistIds(user.id);
  }, [user?.id, fetchWishlistIds]);

  // Local State
  const [viewMode, setViewMode] = useState<ViewMode>("all");
  const [aiQuery, setAiQuery] = useState("");
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [aiSearchError, setAiSearchError] = useState<string | null>(null);
  const [aiResultIds, setAiResultIds] = useState<string[] | null>(null);
  const [resultLimit, setResultLimit] = useState(DEFAULT_RESULT_LIMIT);
  const [currentPage, setCurrentPage] = useState(1);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [hasHydratedState, setHasHydratedState] = useState(false);
  const grantsTopRef = React.useRef<HTMLDivElement>(null);

  const [filters, setFilters] = useState<FilterState>({ ...INITIAL_FILTERS });

  const {
    grants: cachedGrants,
    isLoading: isGrantsCacheLoading,
    error: grantsCacheError,
    fetchAll: fetchAllGrants,
  } = useGrantsCacheStore();

  // Only fetch the full catalog when browsing "all" grants.
  // AI and recommended modes fetch only the matched grants via useGrantsByIds.
  useEffect(() => {
    if (viewMode === "all") fetchAllGrants();
  }, [fetchAllGrants, viewMode]);

  const { data: aiGrants = [], isLoading: isAiGrantsLoading } = useGrantsByIds(
    viewMode === "ai" && aiResultIds?.length ? aiResultIds : undefined
  );

  const { data: recommendedGrants = [], isLoading: isRecommendedLoading } =
    useGrantsByIds(
      viewMode === "recommended" && matchingGrantIds?.length
        ? matchingGrantIds
        : undefined
    );

  // Closed/archived can be 80k+ rows — never cache them, fetch server-side on demand.
  const isHeavyStatus =
    viewMode === "all" &&
    (filters.statusFilter === "closed" ||
      filters.statusFilter === "archived" ||
      filters.statusFilter === "forecasted");

  const { data: heavyStatusData, isLoading: isHeavyStatusLoading } =
    usePaginatedGrants(
      {
        page: currentPage,
        pageSize: ITEMS_PER_PAGE,
        status: filters.statusFilter,
        search: filters.searchTerm || undefined,
        agency:
          filters.agencyFilter !== "all" ? filters.agencyFilter : undefined,
        openDateFrom: filters.startDate
          ? filters.startDate.toISOString().split("T")[0]
          : null,
        openDateTo: filters.endDate
          ? filters.endDate.toISOString().split("T")[0]
          : null,
      },
      { enabled: isHeavyStatus }
    );

  useEffect(() => {
    try {
      const raw = localStorage.getItem(GRANTS_UI_STATE_KEY);
      if (!raw) {
        setHasHydratedState(true);
        return;
      }

      const saved = JSON.parse(raw) as {
        viewMode?: ViewMode;
        aiQuery?: string;
        resultLimit?: number;
        filters?: {
          searchTerm?: string;
          agencyFilter?: string;
          departmentFilter?: string;
          statusFilter?: string;
          startDate?: string | null;
          endDate?: string | null;
        };
      };

      if (
        saved.viewMode === "all" ||
        saved.viewMode === "ai" ||
        saved.viewMode === "recommended"
      ) {
        setViewMode(saved.viewMode);
      }
      if (typeof saved.aiQuery === "string") setAiQuery(saved.aiQuery);
      if (typeof saved.resultLimit === "number") {
        const normalized = Math.max(1, Math.min(100, saved.resultLimit));
        setResultLimit(normalized);
      }
      if (saved.filters) {
        setFilters({
          searchTerm: saved.filters.searchTerm ?? "",
          agencyFilter: saved.filters.agencyFilter ?? "all",
          departmentFilter: saved.filters.departmentFilter ?? "all",
          statusFilter: saved.filters.statusFilter
            ? normalizeGrantStatus(saved.filters.statusFilter)
            : "posted",
          startDate: saved.filters.startDate
            ? parseISO(saved.filters.startDate)
            : null,
          endDate: saved.filters.endDate
            ? parseISO(saved.filters.endDate)
            : null,
        });
      }
    } catch {
      // no-op
    } finally {
      setHasHydratedState(true);
    }
  }, []);

  useEffect(() => {
    if (!hasHydratedState) return;
    localStorage.setItem(
      GRANTS_UI_STATE_KEY,
      JSON.stringify({
        viewMode,
        aiQuery,
        resultLimit,
        filters: {
          ...filters,
          startDate: filters.startDate ? filters.startDate.toISOString() : null,
          endDate: filters.endDate ? filters.endDate.toISOString() : null,
        },
      })
    );
  }, [hasHydratedState, viewMode, aiQuery, resultLimit, filters]);

  const sourceForView = useMemo(() => {
    if (viewMode === "all") return cachedGrants;
    if (viewMode === "ai")
      return aiResultIds === null ? [] : (aiGrants as Grant[]);
    // Suggested tab: only show active (posted) grants — forecasted/closed/archived are not actionable.
    return (recommendedGrants as Grant[]).filter(
      (g) => getGrantDisplayStatus(g) === "posted"
    );
  }, [viewMode, cachedGrants, aiResultIds, aiGrants, recommendedGrants]);

  const { options, filteredGrants, updateFilter, resetFilters } =
    useGrantFilters(
      sourceForView,
      viewMode,
      viewMode === "ai" ? aiResultIds : null,
      filters,
      setFilters
    );

  // For closed/archived/forecasted: server handles filtering+pagination; bypass client-side logic.
  const heavyItems = useMemo(
    () => (heavyStatusData?.items ?? []) as Grant[],
    [heavyStatusData]
  );
  const heavyTotal = heavyStatusData?.total ?? 0;

  const limitedFilteredGrants = useMemo(() => {
    if (isHeavyStatus) return heavyItems;
    if (viewMode === "ai" || viewMode === "recommended") {
      return filteredGrants.slice(0, resultLimit);
    }
    return filteredGrants;
  }, [isHeavyStatus, heavyItems, filteredGrants, viewMode, resultLimit]);

  const totalCount = isHeavyStatus ? heavyTotal : limitedFilteredGrants.length;
  const totalPages = Math.max(1, Math.ceil(totalCount / ITEMS_PER_PAGE));

  // For heavy statuses the API already returns the correct page slice.
  const displayedGrants = useMemo(() => {
    if (isHeavyStatus) return heavyItems;
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return limitedFilteredGrants.slice(start, start + ITEMS_PER_PAGE);
  }, [isHeavyStatus, heavyItems, limitedFilteredGrants, currentPage]);

  const isError = !!grantsCacheError;
  const hasGrantsCache = cachedGrants.length > 0;
  const showCatalogLoading =
    (viewMode === "all" &&
      !isHeavyStatus &&
      isGrantsCacheLoading &&
      !hasGrantsCache) ||
    (viewMode === "all" && isHeavyStatus && isHeavyStatusLoading) ||
    (viewMode === "ai" && isAiGrantsLoading) ||
    (viewMode === "recommended" && isRecommendedLoading);

  const activeFilterCount =
    Number(filters.agencyFilter !== "all") +
    Number(filters.departmentFilter !== "all") +
    Number(!isDefaultStatus(filters.statusFilter)) +
    Number(!!filters.startDate) +
    Number(!!filters.endDate);
  const hasActiveFilters = activeFilterCount > 0;

  useEffect(() => {
    setCurrentPage(1);
  }, [
    viewMode,
    filters.searchTerm,
    filters.statusFilter,
    filters.agencyFilter,
    filters.departmentFilter,
    resultLimit,
    filters.startDate,
    filters.endDate,
    aiResultIds,
    matchingGrantIds,
  ]);

  // Handlers
  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    grantsTopRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  };

  const handleAiSearch = async () => {
    if (!aiQuery.trim()) return;
    setIsAiLoading(true);
    setAiSearchError(null);
    try {
      const res = await axios.post(`${API_URL}/grants/ai-search`, {
        keyword: aiQuery,
        top_k: Math.min(300, Math.max(1, resultLimit) * 4),
      });
      const ids = res.data?.ids ?? [];
      setAiResultIds(Array.isArray(ids) ? ids.map(String) : []);
    } catch (error: unknown) {
      const err = error as {
        response?: { data?: { detail?: string }; status?: number };
        message?: string;
      };
      const message =
        err.response?.data?.detail ??
        (typeof err.response?.data === "string" ? err.response.data : null) ??
        err.message ??
        "AI search failed. Try again.";
      setAiSearchError(message);
      setAiResultIds(null);
    } finally {
      setIsAiLoading(false);
    }
  };

  const handleResetAll = () => {
    resetFilters();
    setAiResultIds(null);
    setAiSearchError(null);
    setAiQuery("");
    setResultLimit(DEFAULT_RESULT_LIMIT);
    setViewMode("all");
    setCurrentPage(1);
  };

  const handleViewModeChange = (nextMode: ViewMode) => {
    if (nextMode === "ai" && viewMode !== "ai") {
      setAiResultIds(null);
      setAiSearchError(null);
      setAiQuery("");
    }
    setViewMode(nextMode);
  };

  const handleWishlistToggle = (grantId: string) => {
    if (!user?.id) return;
    if (isInWishlist(grantId)) {
      removeFromWishlist(user.id, grantId);
    } else {
      addToWishlist(user.id, grantId);
    }
  };

  if (isError) return <Error title="Error loading grants." />;

  const tabConfig = [
    {
      id: "ai",
      label: "AI Search",
      icon: SparklesIcon,
    },
    {
      id: "all",
      label: "All Grants",
      icon: MagnifyingGlassIcon,
    },
    {
      id: "recommended",
      label: "Suggested Grants",
      icon: ListBulletIcon,
    },
  ] as const;

  const filtersPanel = (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
          Filters
        </h3>
        {hasActiveFilters && (
          <Button
            onClick={resetFilters}
            size="xs"
            variant="outline"
            intent="danger"
            endIcon={<HiX className="size-3" />}
          >
            Clear Filters
          </Button>
        )}
      </div>

      <div className="space-y-3">
        <ComboboxFilter
          label="Agency"
          icon={BuildingOfficeIcon}
          value={filters.agencyFilter === "all" ? "" : filters.agencyFilter}
          onChange={(val) => updateFilter("agencyFilter", val || "all")}
          options={options.agencies.map((a) => ({ label: a, value: a }))}
          placeholder="All Agencies"
        />
        <ComboboxFilter
          label="Agency Code"
          icon={BuildingOfficeIcon}
          value={
            filters.departmentFilter === "all" ? "" : filters.departmentFilter
          }
          onChange={(val) => updateFilter("departmentFilter", val || "all")}
          options={options.departments.map((d) => ({ label: d, value: d }))}
          placeholder="All Agency Codes"
        />
        <ComboboxFilter
          label="Status"
          icon={CheckBadgeIcon}
          value={filters.statusFilter === "all" ? "" : filters.statusFilter}
          onChange={(val) =>
            updateFilter(
              "statusFilter",
              val ? normalizeGrantStatus(val) : "all"
            )
          }
          options={options.statuses.map((s) => ({
            label: statusFilterLabel(s),
            value: s,
          }))}
          placeholder="All Statuses"
        />
        <DateFilter
          label="Filter by start date"
          selected={filters.startDate}
          onChange={(d) => updateFilter("startDate", d)}
          selectsStart
          startDate={filters.startDate}
          endDate={filters.endDate}
        />
        <DateFilter
          label="Filter by end date"
          selected={filters.endDate}
          onChange={(d) => updateFilter("endDate", d)}
          selectsEnd
          startDate={filters.startDate}
          endDate={filters.endDate}
          minDate={filters.startDate}
        />
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-8 sm:px-6 lg:px-8 dark:bg-slate-950">
      <div className="mx-auto max-w-6xl lg:max-w-7xl">
        <div ref={grantsTopRef} />
        <PageHeader variant="grants" />
        <DiscoverySearchPanel
          panelTitle="Find grants"
          tabs={tabConfig}
          activeId={viewMode}
          onTabChange={handleViewModeChange}
          hint={
            viewMode === "ai" ? (
              <>
                Describe what you need in plain language; we match it to the
                full grants catalog.
              </>
            ) : viewMode === "recommended" ? (
              <>
                Rankings use your profile to surface the most relevant
                opportunities.
              </>
            ) : undefined
          }
          limitControl={
            viewMode === "ai" || viewMode === "recommended" ? (
              <ResultLimitRow>
                <Slider
                  min={1}
                  max={100}
                  step={1}
                  value={[resultLimit]}
                  onValueChange={([val]: number[]) => setResultLimit(val)}
                  showValue
                  aria-label="Maximum number of results"
                />
              </ResultLimitRow>
            ) : undefined
          }
        >
          {viewMode === "ai" ? (
            <>
              <div className="flex flex-col gap-2 sm:flex-row sm:items-stretch">
                <InputField
                  className="min-w-0 flex-1"
                  startIcon={<SparklesIcon className="h-5 w-5" />}
                  placeholder="e.g. early-stage cancer biomarkers, renewable energy pilots…"
                  value={aiQuery}
                  onChange={(e) => {
                    setAiQuery(e.target.value);
                    if (aiSearchError) setAiSearchError(null);
                  }}
                  onKeyDown={(e) => e.key === "Enter" && handleAiSearch()}
                />
                <Button
                  intent="primary"
                  onClick={handleAiSearch}
                  disabled={isAiLoading}
                  className="shrink-0 sm:self-stretch"
                  startIcon={<MagnifyingGlassIcon className="size-5" />}
                >
                  {isAiLoading ? "Analyzing…" : "Search"}
                </Button>
              </div>
              {aiSearchError && (
                <p
                  className="text-sm text-red-600 dark:text-red-400"
                  role="alert"
                >
                  {aiSearchError}
                </p>
              )}
            </>
          ) : (
            <InputField
              startIcon={
                <MagnifyingGlassIcon className="h-5 w-5 text-slate-400" />
              }
              placeholder="Search by title, agency, grant number, or keyword…"
              value={filters.searchTerm}
              onChange={(e) => updateFilter("searchTerm", e.target.value)}
            />
          )}
        </DiscoverySearchPanel>

        <SidebarLayout
          sidebar={filtersPanel}
          sidebarTitle="Grant Filters"
          open={sidebarOpen}
          onOpenChange={setSidebarOpen}
        >
          <FilterSummary
            count={totalCount}
            filters={filters}
            onReset={handleResetAll}
            viewMode={viewMode}
          />

          {viewMode === "recommended" && !user ? (
            <SuggestedLoginState />
          ) : viewMode === "recommended" &&
            user &&
            !hasGrantsCache &&
            isGrantsCacheLoading ? (
            <div className="border-border bg-muted/40 flex min-h-70 flex-col items-center justify-center rounded-2xl border py-16">
              <Loading mode="inline" title="Loading grants catalog…" />
            </div>
          ) : viewMode === "recommended" && user && isSuggestedLoading ? (
            <div className="border-border bg-muted/50 flex min-h-55 flex-col items-center justify-center rounded-2xl border border-dashed py-12">
              <Loading
                mode="inline"
                title="Finding grants that match your profile…"
              />
            </div>
          ) : viewMode === "recommended" &&
            user &&
            isSuggestedFetched &&
            !isRecommendedLoading &&
            totalCount === 0 ? (
            <SuggestedEmptyState userId={user.id} />
          ) : viewMode === "ai" && aiResultIds === null ? (
            <div className="border-border bg-card flex min-h-70 flex-col items-center justify-center rounded-2xl border px-6 py-16 text-center shadow-sm sm:px-8 sm:py-20">
              <div className="mb-5 flex h-20 w-20 items-center justify-center rounded-2xl bg-slate-100 shadow-sm sm:mb-6 dark:bg-slate-800">
                <SparklesIcon className="h-10 w-10 text-slate-600 dark:text-slate-300" />
              </div>
              <h3 className="text-foreground text-xl font-semibold">
                AI Grant Search
              </h3>
              <p className="text-muted-foreground mt-3 max-w-md text-sm leading-relaxed">
                Describe your research goal in the search bar above and press
                Search. We match your description against the full grants
                catalog and return the most relevant opportunities.
              </p>
              <p className="text-muted-foreground mt-4 text-xs font-medium tracking-wider uppercase">
                Try: &quot;early-stage cancer biomarkers&quot; or
                &quot;renewable energy pilot&quot;
              </p>
            </div>
          ) : (viewMode === "all" || (viewMode === "recommended" && user)) &&
            showCatalogLoading ? (
            <div className="border-border bg-muted/40 flex min-h-70 flex-col items-center justify-center rounded-2xl border py-16">
              <Loading mode="inline" title="Loading grants catalog…" />
            </div>
          ) : totalCount === 0 ? (
            <EmptyState onReset={handleResetAll} />
          ) : (
            <div className="space-y-8">
              <div
                className={
                  sidebarOpen
                    ? "grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-2"
                    : "grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3"
                }
              >
                {displayedGrants.map((grant, index) => (
                  <GrantSummaryCard
                    key={grant.id}
                    grant={grant}
                    isLoggedIn={!!user}
                    isWishlisted={isInWishlist(grant.id)}
                    onWishlistToggle={handleWishlistToggle}
                    animationDelay={index * 0.05}
                    highlightQuery={
                      viewMode === "ai" ? aiQuery : filters.searchTerm
                    }
                    isAiResult={viewMode === "ai"}
                  />
                ))}
              </div>

              {totalPages > 1 && (
                <Pagination
                  currentPage={currentPage}
                  totalPages={totalPages}
                  onPageChange={handlePageChange}
                />
              )}
            </div>
          )}
        </SidebarLayout>
      </div>
    </div>
  );
};

interface DateFilterProps {
  label: string;
  selected: Date | null;
  onChange: (date: Date | null) => void;
  startDate?: Date | null;
  endDate?: Date | null;
  minDate?: Date | null;
  selectsStart?: boolean;
  selectsEnd?: boolean;
}

const DateFilter = ({
  label,
  onChange,
  minDate,
  ...props
}: DateFilterProps) => (
  <div className="space-y-2">
    <label className="flex items-center text-sm font-medium text-slate-700 dark:text-slate-300">
      <CalendarIcon className="mr-2 size-4 text-slate-500 dark:text-slate-400" />{" "}
      {label}
    </label>
    <div>
      <DatePicker
        {...props}
        minDate={minDate ?? undefined}
        onChange={(value: Date | null | Date[]) => {
          const d = Array.isArray(value) ? (value[0] ?? null) : value;
          onChange(d);
        }}
        dateFormat="yyyy-MM-dd"
        wrapperClassName="w-full"
        className="focus:border-primary-500 focus:ring-primary-500 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm placeholder:text-slate-400 focus:ring-1 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
        placeholderText="Select date"
        isClearable
      />
    </div>
  </div>
);

interface FilterSummaryProps {
  count: number;
  filters: FilterState;
  onReset: () => void;
  viewMode: ViewMode;
}

const FilterSummary = ({
  count,
  filters,
  onReset,
  viewMode,
}: FilterSummaryProps) => {
  const getModeLabel = () => {
    switch (viewMode) {
      case "ai":
        return "AI Matched Results";
      case "recommended":
        return "Suggested Grants";
      default:
        return "Grants";
    }
  };

  const hasActiveFilters =
    filters.searchTerm ||
    filters.agencyFilter !== "all" ||
    filters.departmentFilter !== "all" ||
    !isDefaultStatus(filters.statusFilter) ||
    filters.startDate ||
    filters.endDate;

  return (
    <div className="border-border my-6 flex flex-col items-start justify-between border-t pt-4 text-sm sm:flex-row sm:items-center">
      <div className="text-slate-600 dark:text-slate-400">
        Found{" "}
        <span className="font-bold text-slate-900 dark:text-white">
          {count}
        </span>{" "}
        {getModeLabel()}
        {filters.agencyFilter !== "all" && (
          <>
            {" "}
            for{" "}
            <span className="text-primary-600 dark:text-primary-400 font-medium">
              {filters.agencyFilter}
            </span>
          </>
        )}
      </div>

      {(hasActiveFilters || viewMode !== "all") && (
        <Button
          onClick={onReset}
          size="xs"
          variant="outline"
          intent="danger"
          endIcon={<HiX className="size-3" />}
        >
          Clear Filters
        </Button>
      )}
    </div>
  );
};

const SuggestedLoginState = () => (
  <div className="border-border bg-muted/50 flex flex-col items-center justify-center rounded-2xl border border-dashed py-16 text-center sm:py-20">
    <div className="mb-5 flex h-20 w-20 items-center justify-center rounded-2xl bg-slate-100 shadow-sm sm:mb-6 dark:bg-slate-800">
      <UserCircleIcon className="h-10 w-10 text-slate-600 dark:text-slate-300" />
    </div>
    <h3 className="text-foreground text-xl font-semibold">
      Sign in to see suggested grants
    </h3>
    <p className="mt-3 max-w-md text-sm leading-relaxed text-slate-600 dark:text-slate-400">
      We match funding opportunities to <strong>your</strong> profile using
      vector search (research interests, projects, education). Sign in so we can
      load your profile and show suggested grants here.
    </p>
    <Button
      href="/login/"
      intent="primary"
      className="mt-8"
      startIcon={<ArrowRightOnRectangleIcon className="h-5 w-5 shrink-0" />}
    >
      Sign in
    </Button>
  </div>
);

const SuggestedEmptyState = ({ userId }: { userId: string }) => (
  <div className="border-border bg-muted/50 flex flex-col items-center justify-center rounded-2xl border border-dashed py-16 text-center sm:py-20">
    <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100 shadow-sm dark:bg-slate-800">
      <SparklesIcon className="h-8 w-8 text-slate-600 dark:text-slate-300" />
    </div>
    <h3 className="text-foreground text-xl font-semibold">
      No suggested grants yet
    </h3>
    <p className="mt-3 max-w-md text-sm leading-relaxed text-slate-600 dark:text-slate-400">
      Your profile needs more detail (research interests, bio, projects). Update
      your profile and check again—suggestions improve as your profile grows.
    </p>
    <Button
      href={`/profile/?id=${encodeURIComponent(userId)}`}
      intent="primary"
      variant="outline"
      className="mt-8"
    >
      Edit your profile
    </Button>
  </div>
);

const EmptyState = ({ onReset }: { onReset: () => void }) => (
  <div className="border-border bg-muted/50 flex flex-col items-center justify-center rounded-2xl border border-dashed py-20 text-center">
    <div className="bg-card mb-4 rounded-full p-4 shadow-sm">
      <MagnifyingGlassIcon className="text-muted-foreground h-8 w-8" />
    </div>
    <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
      No grants found
    </h3>
    <p className="mt-2 max-w-sm text-sm text-slate-500 dark:text-slate-400">
      We couldn&apos;t find any grants matching your current filters. Try
      adjusting your search criteria.
    </p>
    <Button onClick={onReset} className="mt-6">
      Reset All Filters
    </Button>
  </div>
);

export default GrantsExplorer;
