"use client";

import React, { useMemo, useState, useEffect, type FC } from "react";
import { HiSearch, HiUserAdd, HiX } from "react-icons/hi";
import { HiSparkles } from "react-icons/hi2";
import {
  useCollaboratorsCacheStore,
  type Collaborator,
} from "@/store/useCollaborator";
import ProfileCard from "@/components/ProfileCard";
import { type FilterOptions } from "@/data/profile";
import PageHeader from "@/components/PageHeader";
import InputField from "@/components/ui/InputField";
import ViewModeTabs from "@/components/ui/ViewModeTabs";
import { AcademicStatusPicker } from "@/components/ui/AcademicStatusPicker";
import { Slider } from "@/components/ui/Slider";
import SidebarLayout from "@/components/ui/SidebarLayout";
import Loading from "../loading";
import Error from "@/app/error";
import Button from "@/components/ui/Button";
import Pagination from "@/components/Pagination";
import { API_URL } from "@/data/global";
import axios from "axios";
import {
  ACADEMIC_STATUS_CONFIG,
  AcademicStatusKey,
} from "@/store/useProfileStore";

const ITEMS_PER_PAGE = 12;
type ViewMode = "all" | "ai";
const COLLABORATOR_UI_STATE_KEY = "collaborators-ui-state-v1";
const DEFAULT_RESULT_LIMIT = 25;

const DEFAULT_FILTERS: FilterOptions = {
  searchQuery: "",
  openToCollaboration: false,
  seekingPhd: false,
  acceptingInterns: false,
  lookingForPostdocs: false,
  availableForMentorship: false,
};

const keyMap: Record<
  AcademicStatusKey,
  keyof Omit<FilterOptions, "searchQuery">
> = {
  open_to_collaboration: "openToCollaboration",
  seeking_phd_students: "seekingPhd",
  accepting_interns: "acceptingInterns",
  looking_for_postdocs: "lookingForPostdocs",
  available_for_mentorship: "availableForMentorship",
};

const filterCollaborators = (
  collaborators: Collaborator[] | undefined | null,
  filters: FilterOptions,
  viewMode: ViewMode,
  aiResultIds: string[] | null
): Collaborator[] => {
  const input = Array.isArray(collaborators) ? collaborators : [];
  let filtered = [...input];

  if (viewMode === "ai" && aiResultIds !== null) {
    const idSet = new Set(aiResultIds.map(String));
    filtered = filtered.filter((c) => idSet.has(String(c.id)));
  }

  const query = filters.searchQuery.trim().toLowerCase();
  if (viewMode === "all" && query) {
    filtered = filtered.filter((collaborator) => {
      const tokens = query
        .split(/\s+/)
        .map((t) => t.trim())
        .filter(Boolean);

      const searchableText = [
        String(collaborator?.id ?? ""),
        collaborator?.username,
        collaborator?.first_name,
        collaborator?.last_name,
        collaborator?.email,
        collaborator?.title,
        collaborator?.institution,
        collaborator?.department,
        collaborator?.bio,
        ...(Array.isArray(collaborator?.research_interests)
          ? collaborator.research_interests
          : []),
        ...(Array.isArray(collaborator?.current_projects)
          ? collaborator.current_projects.flatMap((p) => [
              p?.title,
              p?.description,
              p?.status,
            ])
          : []),
        ...(Array.isArray(collaborator?.education)
          ? collaborator.education.flatMap((e) => [
              e?.degree,
              e?.institution,
              e?.field_of_study,
            ])
          : []),
      ]
        .filter((v): v is string => !!v)
        .join(" ")
        .toLowerCase();

      return tokens.every((token) => searchableText.includes(token));
    });
  }

  if (filters.openToCollaboration) {
    filtered = filtered.filter(
      (c) => c.academic_status?.open_to_collaboration === true
    );
  }
  if (filters.seekingPhd) {
    filtered = filtered.filter(
      (c) => c.academic_status?.seeking_phd_students === true
    );
  }
  if (filters.acceptingInterns) {
    filtered = filtered.filter(
      (c) => c.academic_status?.accepting_interns === true
    );
  }
  if (filters.lookingForPostdocs) {
    filtered = filtered.filter(
      (c) => c.academic_status?.looking_for_postdocs === true
    );
  }
  if (filters.availableForMentorship) {
    filtered = filtered.filter(
      (c) => c.academic_status?.available_for_mentorship === true
    );
  }

  return filtered;
};

const hasActiveFilters = (filters: FilterOptions): boolean => {
  return (
    !!filters.searchQuery.trim() ||
    filters.openToCollaboration ||
    filters.seekingPhd ||
    filters.acceptingInterns ||
    filters.lookingForPostdocs ||
    filters.availableForMentorship
  );
};

const EmptyState: FC<{ hasFilters: boolean; viewMode: ViewMode }> = ({
  hasFilters,
  viewMode,
}) => (
  <div className="py-12 text-center">
    <div className="mb-4 inline-flex h-16 w-16 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800">
      <HiUserAdd className="h-8 w-8 text-slate-400" />
    </div>
    <h3 className="mb-2 text-xl font-semibold text-slate-900 dark:text-white">
      {viewMode === "ai"
        ? "No AI matches yet"
        : hasFilters
          ? "No collaborators found"
          : "No collaborators yet"}
    </h3>
    <p className="text-slate-600 dark:text-slate-400">
      {viewMode === "ai"
        ? "Try a different search (e.g. research area, role, or interest)."
        : hasFilters
          ? "Try adjusting your filters to see more results"
          : "Check back later for new collaborators"}
    </p>
  </div>
);

/** Shown before user has searched — professional prompt to start searching (full DB search from cache). */
const StartResearchingState: FC = () => (
  <div className="border-border bg-card flex flex-col items-center justify-center rounded-xl border px-4 py-12 text-center sm:px-6 sm:py-20">
    <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-slate-100 sm:mb-5 sm:h-16 sm:w-16 dark:bg-slate-800">
      <HiSearch
        className="h-7 w-7 text-slate-600 sm:h-8 sm:w-8 dark:text-slate-300"
        aria-hidden
      />
    </div>
    <h2 className="text-foreground mb-2 text-base font-semibold tracking-tight sm:text-xl">
      Start researching your collaborators
    </h2>
    <p className="mb-4 max-w-md px-1 text-sm leading-relaxed text-slate-600 dark:text-slate-400">
      Use the search bar above to find researchers by name, institution, or
      department. Results are drawn from the full database.
    </p>
    <p className="flex items-center justify-center gap-2 text-xs font-medium tracking-wider text-slate-500 dark:text-slate-500">
      <span>Search or use AI for semantic matching</span>
    </p>
  </div>
);

const FilterPanel: FC<{
  filters: FilterOptions;
  setFilters: React.Dispatch<React.SetStateAction<FilterOptions>>;
}> = ({ filters, setFilters }) => {
  return (
    <AcademicStatusPicker
      options={ACADEMIC_STATUS_CONFIG}
      isChecked={(key) => !!filters[keyMap[key]]}
      onToggle={(key, checked) =>
        setFilters((prev) => ({ ...prev, [keyMap[key]]: checked }))
      }
      columns={1}
    />
  );
};

const Collaborators: FC = () => {
  const [viewMode, setViewMode] = useState<ViewMode>("all");
  const [aiQuery, setAiQuery] = useState("");
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [aiResultIds, setAiResultIds] = useState<string[] | null>(null);
  const [resultLimit, setResultLimit] = useState(DEFAULT_RESULT_LIMIT);
  const [currentPage, setCurrentPage] = useState(1);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [hasHydratedState, setHasHydratedState] = useState(false);
  const [filters, setFilters] = useState<FilterOptions>({ ...DEFAULT_FILTERS });

  const isAllView = viewMode === "all";
  const {
    collaborators: cachedCollaborators,
    isLoading: isCacheLoading,
    error: cacheError,
    fetchAll,
  } = useCollaboratorsCacheStore();

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(COLLABORATOR_UI_STATE_KEY);
      if (!raw) {
        setHasHydratedState(true);
        return;
      }

      const saved = JSON.parse(raw) as {
        viewMode?: ViewMode;
        aiQuery?: string;
        resultLimit?: number;
        filters?: FilterOptions;
      };

      if (saved.viewMode === "all" || saved.viewMode === "ai") {
        setViewMode(saved.viewMode);
      }
      if (typeof saved.aiQuery === "string") setAiQuery(saved.aiQuery);
      if (typeof saved.resultLimit === "number") {
        const normalized = Math.max(1, Math.min(100, saved.resultLimit));
        setResultLimit(normalized);
      }
      if (saved.filters) {
        setFilters({
          searchQuery: saved.filters.searchQuery ?? "",
          openToCollaboration:
            saved.filters.openToCollaboration ??
            DEFAULT_FILTERS.openToCollaboration,
          seekingPhd: !!saved.filters.seekingPhd,
          acceptingInterns: !!saved.filters.acceptingInterns,
          lookingForPostdocs: !!saved.filters.lookingForPostdocs,
          availableForMentorship: !!saved.filters.availableForMentorship,
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
      COLLABORATOR_UI_STATE_KEY,
      JSON.stringify({
        viewMode,
        aiQuery,
        resultLimit,
        filters,
      })
    );
  }, [hasHydratedState, viewMode, aiQuery, resultLimit, filters]);

  const sourceList = useMemo(() => {
    if (viewMode === "ai") {
      if (aiResultIds === null) return [];
      const idSet = new Set(aiResultIds.map(String));
      return cachedCollaborators.filter((c) => idSet.has(String(c.id)));
    }
    return cachedCollaborators;
  }, [viewMode, aiResultIds, cachedCollaborators]);

  const filteredCollaborators = useMemo(
    () =>
      filterCollaborators(
        sourceList,
        filters,
        viewMode,
        viewMode === "ai" ? aiResultIds : null
      ),
    [sourceList, filters, viewMode, aiResultIds]
  );

  const limitedFilteredCollaborators = useMemo(() => {
    if (viewMode === "ai") return filteredCollaborators.slice(0, resultLimit);
    return filteredCollaborators;
  }, [filteredCollaborators, viewMode, resultLimit]);

  const hasSearchedOrFiltered =
    !!filters.searchQuery.trim() || hasActiveFilters(filters);
  const showStartResearching = isAllView && !hasSearchedOrFiltered;
  const showAiBeforeSearch = viewMode === "ai" && aiResultIds === null;
  const totalCount = limitedFilteredCollaborators.length;
  const totalPages = Math.max(1, Math.ceil(totalCount / ITEMS_PER_PAGE));
  const displayedCollaborators = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return limitedFilteredCollaborators.slice(start, start + ITEMS_PER_PAGE);
  }, [limitedFilteredCollaborators, currentPage]);

  const isError = !!cacheError;

  const hasCache = cachedCollaborators.length > 0;

  useEffect(() => {
    setCurrentPage(1);
  }, [viewMode, filters.searchQuery, resultLimit]);

  const clearFilters = () => {
    setFilters({ ...DEFAULT_FILTERS });
    setAiResultIds(null);
    setAiQuery("");
    setResultLimit(DEFAULT_RESULT_LIMIT);
    setViewMode("all");
    setCurrentPage(1);
  };

  const handleAiSearch = async () => {
    if (!aiQuery.trim()) return;
    setIsAiLoading(true);
    try {
      await fetchAll();
      const res = await axios.post<{ ids: string[] }>(
        `${API_URL}/users/ai-search`,
        {
          keyword: aiQuery.trim(),
          top_k: Math.max(1, Math.min(100, resultLimit)),
        }
      );
      setAiResultIds((res.data?.ids ?? []).map(String));
      setCurrentPage(1);
    } catch {
      setAiResultIds([]);
    } finally {
      setIsAiLoading(false);
    }
  };

  const handleViewModeChange = (nextMode: ViewMode) => {
    if (nextMode === "ai" && viewMode !== "ai") {
      setAiResultIds(null);
      setAiQuery("");
    }
    setViewMode(nextMode);
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  if (isError)
    return (
      <Error title="Error loading collaborators. Please try again later." />
    );
  if (isCacheLoading && !hasCache)
    return <Loading title="Loading collaborators..." />;

  const tabConfig = [
    {
      id: "all" as const,
      label: "All Researchers",
      icon: HiSearch,
    },
    {
      id: "ai" as const,
      label: "AI Search",
      icon: HiSparkles,
    },
  ];

  const filtersPanel = (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
          Filter by status
        </h3>
        {hasActiveFilters(filters) && (
          <Button
            onClick={clearFilters}
            variant="outline"
            intent="danger"
            size="xs"
            className="shrink-0"
            startIcon={<HiX className="size-3" />}
          >
            Clear Filters
          </Button>
        )}
      </div>
      <FilterPanel filters={filters} setFilters={setFilters} />
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 px-3 py-6 sm:px-6 sm:py-8 lg:px-8 dark:bg-slate-950">
      <div className="mx-auto max-w-6xl lg:max-w-7xl">
        <PageHeader variant="collaborators" />

        {/* Toolbar */}
        <div className="mb-5 overflow-hidden rounded-xl border border-slate-200 bg-white pb-4 shadow-[0_2px_8px_rgba(0,0,0,0.06),0_1px_2px_rgba(0,0,0,0.04)] sm:mb-6 dark:border-slate-700/70 dark:bg-slate-900 dark:shadow-[0_2px_8px_rgba(0,0,0,0.3)]">
          {/* Accent bar — matches PageHeader */}
          <div className="h-0.5 bg-linear-to-r from-slate-300 via-slate-200 to-transparent dark:from-slate-600 dark:via-slate-700 dark:to-transparent" />

          {/* Tab strip */}
          <div className="px-5 pt-4 pb-2 sm:px-6">
            <ViewModeTabs
              tabs={tabConfig}
              activeId={viewMode}
              onChange={handleViewModeChange}
              buttonClassName="sm:px-4"
            />
          </div>

          {/* Search */}
          <div className="flex flex-col gap-3 border-t border-slate-100 px-5 py-5 sm:flex-row sm:items-center sm:px-6 dark:border-slate-800">
            {viewMode === "ai" ? (
              <div className="flex flex-1 flex-col gap-2">
                <div className="flex flex-1 flex-col gap-2 sm:flex-row">
                  <InputField
                    className="flex-1"
                    type="text"
                    startIcon={<HiSparkles className="size-5" />}
                    placeholder="Describe the expertise you need (e.g., machine learning for genomics, climate science mentorship..."
                    value={aiQuery}
                    onChange={(e) => setAiQuery(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleAiSearch()}
                  />
                  <Button
                    intent="primary"
                    onClick={handleAiSearch}
                    disabled={isAiLoading}
                    className="shrink-0"
                    startIcon={<HiSearch className="size-5" />}
                  >
                    {isAiLoading ? "Searching..." : "Search"}
                  </Button>
                </div>
                <div className="flex flex-wrap items-center gap-3 text-xs text-slate-600 dark:text-slate-300">
                  <div className="space-y-0.5">
                    <p className="text-xs">
                      AI Search semantically matches your query against all
                      collaborator profiles.
                    </p>
                    <div className="mt-4 flex items-center gap-3">
                      <span className="shrink-0 text-xs text-slate-500 dark:text-slate-400">
                        Results
                      </span>
                      <Slider
                        min={1}
                        max={100}
                        step={1}
                        value={[resultLimit]}
                        onValueChange={([val]: number[]) => setResultLimit(val)}
                        showValue
                        aria-label="Number of results"
                      />
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <InputField
                className="flex-1"
                type="text"
                startIcon={<HiSearch className="size-5 text-slate-400" />}
                placeholder="Search by name, institution, department, or research interests..."
                value={filters.searchQuery}
                onChange={(e) =>
                  setFilters((prev) => ({
                    ...prev,
                    searchQuery: e.target.value,
                  }))
                }
              />
            )}
          </div>
        </div>

        <SidebarLayout
          sidebar={filtersPanel}
          sidebarTitle="Collaborator Filters"
          open={sidebarOpen}
          onOpenChange={setSidebarOpen}
        >
          {showStartResearching ? (
            <StartResearchingState />
          ) : showAiBeforeSearch ? (
            <div className="border-border bg-card flex min-h-70 flex-col items-center justify-center rounded-2xl border px-6 py-16 text-center shadow-sm sm:px-8 sm:py-20">
              <div className="mb-5 flex h-20 w-20 items-center justify-center rounded-2xl bg-slate-100 shadow-sm sm:mb-6 dark:bg-slate-800">
                <HiSparkles className="h-10 w-10 text-slate-600 dark:text-slate-300" />
              </div>
              <h2 className="text-foreground text-xl font-semibold">
                AI Collaborator Search
              </h2>
              <p className="text-muted-foreground mt-3 max-w-md text-sm leading-relaxed">
                Enter a research topic, role, or interest in the search bar
                above and press Search. We match your description against the
                full researcher directory and return the most relevant profiles.
              </p>
              <p className="text-muted-foreground mt-4 text-xs font-medium tracking-wider uppercase">
                Try: &quot;machine learning&quot;, &quot;mentorship&quot;, or
                &quot;cancer research&quot;
              </p>
            </div>
          ) : (
            <>
              {/* Results count + Clear */}
              <div className="border-border mb-4 flex flex-col items-start justify-between gap-2 border-t pt-4 sm:mb-6 sm:flex-row sm:items-center">
                <p className="text-sm text-slate-600 sm:text-base dark:text-slate-400">
                  <span className="font-semibold text-slate-900 dark:text-white">
                    {totalCount}
                  </span>{" "}
                  {totalCount === 1 ? "researcher" : "researchers"} found
                </p>
                {hasActiveFilters(filters) && (
                  <Button
                    onClick={clearFilters}
                    intent="danger"
                    size="xs"
                    variant="outline"
                    endIcon={<HiX className="size-3" />}
                  >
                    Clear Filters
                  </Button>
                )}
              </div>

              {totalCount === 0 ? (
                <EmptyState
                  hasFilters={hasActiveFilters(filters)}
                  viewMode={viewMode}
                />
              ) : (
                <>
                  <div
                    className={
                      sidebarOpen
                        ? "grid grid-cols-1 gap-4 sm:gap-6 md:grid-cols-2 lg:grid-cols-2"
                        : "grid grid-cols-1 gap-4 sm:gap-6 md:grid-cols-2 lg:grid-cols-3"
                    }
                  >
                    {displayedCollaborators.map((collaborator) => (
                      <ProfileCard
                        key={collaborator.id}
                        collaborator={collaborator}
                        highlightQuery={
                          viewMode === "ai" ? aiQuery : filters.searchQuery
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
                </>
              )}
            </>
          )}
        </SidebarLayout>
      </div>
    </div>
  );
};

export default Collaborators;
