"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  FiArrowLeft,
  FiExternalLink,
  FiCalendar,
  FiClock,
  FiArchive,
  FiDollarSign,
  FiMail,
  FiPhone,
  FiChevronDown,
  FiChevronUp,
  FiAlertCircle,
  FiLoader,
} from "react-icons/fi";
import { BookmarkIcon as BookmarkSolid } from "@heroicons/react/24/solid";
import { BookmarkIcon as BookmarkOutline } from "@heroicons/react/24/outline";
import { API_URL } from "@/data/global";
import { useAuthStore } from "@/store/useAuthStore";
import { useWishlistStore } from "@/store/useWishListStore";
import Button from "@/components/ui/Button";
import Link from "@/components/ui/Link";

interface GrantData {
  id: number;
  opportunityNumber?: string;
  opportunityTitle?: string;
  synopsis?: {
    synopsisDesc?: string;
    postingDate?: string;
    responseDate?: string;
    archiveDate?: string;
    agencyName?: string;
    agencyContactEmail?: string;
    agencyContactDesc?: string;
    agencyContactPhone?: string;
    fundingDescLinkUrl?: string;
    awardCeilingFormatted?: string;
    applicantEligibilityDesc?: string;
  };
  agencyDetails?: {
    agencyName?: string;
  };
  topAgencyDetails?: {
    agencyName?: string;
  };
}

const GrantDetail = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const id = searchParams.get("id");
  const [grant, setGrant] = useState<GrantData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<string>("summary");
  const [expandedSections, setExpandedSections] = useState<
    Record<string, boolean>
  >({});
  const { user } = useAuthStore();
  const { fetchWishlistIds, addToWishlist, removeFromWishlist, isInWishlist } =
    useWishlistStore();

  useEffect(() => {
    if (user?.id) fetchWishlistIds(user.id);
  }, [user?.id, fetchWishlistIds]);

  useEffect(() => {
    const fetchGrantDetails = async () => {
      try {
        setLoading(true);
        const response = await fetch(`${API_URL}/grants/${id}`);
        if (response.ok) {
          const data = await response.json();
          setGrant(data.data);
          window.scrollTo(0, 0);
        } else {
          setError("No grant data found");
        }
      } catch {
        setError("Error fetching grant details. Please try again later.");
      } finally {
        setLoading(false);
      }
    };
    if (id) fetchGrantDetails();
  }, [id]);

  const formatDate = (dateString?: string) => {
    if (!dateString) return "N/A";
    try {
      return new Date(dateString).toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      });
    } catch {
      return dateString;
    }
  };

  const getRemainingDays = (dateString?: string) => {
    if (!dateString) return null;
    try {
      const dueDate = new Date(dateString).getTime();
      const today = new Date().getTime();
      return Math.ceil((dueDate - today) / (1000 * 60 * 60 * 24));
    } catch {
      return null;
    }
  };

  const stripHtml = (html?: string) => {
    if (!html) return "";
    return html
      .replace(/<[^>]*>?/gm, "")
      .replace(/&nbsp;/gi, " ")
      .replace(/\u00A0/g, " ")
      .replace(/&amp;/gi, "&")
      .replace(/&lt;/gi, "<")
      .replace(/&gt;/gi, ">")
      .replace(/&quot;/gi, '"')
      .replace(/\s+/g, " ")
      .trim();
  };

  const toggleSection = (section: string) => {
    setExpandedSections((prev) => ({ ...prev, [section]: !prev[section] }));
  };

  const TruncatedText = ({
    text,
    maxLength = 300,
    id,
  }: {
    text: string;
    maxLength?: number;
    id: string;
  }) => {
    const needsTruncation = text.length > maxLength;
    const isExpanded = expandedSections[id] || !needsTruncation;
    return (
      <div>
        <p
          className={`text-sm leading-relaxed text-slate-600 dark:text-slate-300 ${!isExpanded ? "line-clamp-4" : ""}`}
        >
          {text}
        </p>
        {needsTruncation && (
          <Button
            variant="link"
            intent="default"
            onClick={() => toggleSection(id)}
            className="mt-2"
            endIcon={
              isExpanded ? (
                <FiChevronUp className="h-4 w-4" />
              ) : (
                <FiChevronDown className="h-4 w-4" />
              )
            }
          >
            {isExpanded ? "Show Less" : "Show More"}
          </Button>
        )}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center px-4">
        <div className="text-center">
          <FiLoader className="mx-auto h-10 w-10 animate-spin text-slate-400" />
          <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">
            Loading grant details…
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="w-full max-w-sm text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-red-50 dark:bg-red-950/30">
            <FiAlertCircle className="h-8 w-8 text-red-500" />
          </div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">
            Could not load grant
          </h2>
          <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
            {error}
          </p>
          <Button
            className="mt-6"
            variant="outline"
            startIcon={<FiArrowLeft className="h-4 w-4" />}
            onClick={() => router.back()}
          >
            Go Back
          </Button>
        </div>
      </div>
    );
  }

  const dueRemainingDays = getRemainingDays(grant?.synopsis?.responseDate);

  const deadlineBadge =
    dueRemainingDays !== null ? (
      <span
        className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${
          dueRemainingDays < 0
            ? "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400"
            : dueRemainingDays === 0
              ? "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400"
              : dueRemainingDays < 14
                ? "bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
                : "bg-slate-100 text-slate-600 dark:bg-white/10 dark:text-slate-300"
        }`}
      >
        <FiClock className="h-3 w-3 shrink-0" />
        {dueRemainingDays < 0
          ? "Closed"
          : dueRemainingDays === 0
            ? "Due today"
            : `${dueRemainingDays}d left`}
      </span>
    ) : null;

  const TABS = [
    { key: "summary", label: "Summary" },
    { key: "details", label: "Dates & Details" },
    { key: "agency", label: "Agency Info" },
    { key: "eligibility", label: "Eligibility" },
  ];

  return (
    <div className="min-h-screen px-4 py-6 sm:px-6 sm:py-10 lg:px-8 dark:bg-slate-950">
      <div className="mx-auto max-w-4xl space-y-4">
        {/* Back nav */}
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            className="h-9 w-9 shrink-0 p-0!"
            onClick={() => router.back()}
            aria-label="Go back"
          >
            <FiArrowLeft className="h-4 w-4" />
          </Button>
          <p className="text-xs font-semibold tracking-wider text-slate-600 uppercase dark:text-slate-300">
            Grant Opportunity
          </p>
        </div>

        {/* Main card */}
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900/80 dark:shadow-2xl dark:shadow-black/50">
          {/* Header hero */}
          <div className="bg-slate-800 px-5 py-6 sm:px-7 sm:py-8 dark:bg-slate-800">
            <div>
              {grant?.opportunityNumber && (
                <p className="mb-2 font-mono text-xs text-slate-400">
                  {grant.opportunityNumber}
                </p>
              )}
              <h1 className="text-lg leading-snug font-bold text-white sm:text-xl">
                {grant?.opportunityTitle || "Grant Details"}
              </h1>
              {(grant?.synopsis?.agencyName ||
                grant?.agencyDetails?.agencyName) && (
                <p className="mt-1.5 text-sm text-slate-300">
                  {grant.synopsis?.agencyName ||
                    grant.agencyDetails?.agencyName}
                </p>
              )}
              {grant?.synopsis?.agencyContactDesc && (
                <p className="mt-1 text-xs text-slate-400">
                  {stripHtml(grant.synopsis.agencyContactDesc)}
                </p>
              )}
              {(deadlineBadge || grant?.synopsis?.awardCeilingFormatted) && (
                <div className="mt-4 flex flex-wrap items-center gap-2">
                  {deadlineBadge}
                  {grant?.synopsis?.awardCeilingFormatted && (
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-2.5 py-1 text-xs font-semibold text-slate-200">
                      <FiDollarSign className="h-3 w-3" />$
                      {grant.synopsis.awardCeilingFormatted}
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-1 divide-y divide-slate-100 border-y border-slate-200 sm:grid-cols-3 sm:divide-x sm:divide-y-0 dark:divide-slate-700 dark:border-slate-700">
            <div className="flex items-center gap-3 px-5 py-4 sm:px-6">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-200">
                <FiCalendar className="h-4 w-4" />
              </span>
              <div className="min-w-0">
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Agency
                </p>
                <p className="truncate text-sm font-semibold text-slate-900 dark:text-slate-100">
                  {grant?.synopsis?.agencyName ||
                    grant?.agencyDetails?.agencyName ||
                    "N/A"}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3 px-5 py-4 sm:px-6">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-200">
                <FiClock className="h-4 w-4" />
              </span>
              <div>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Response Due
                </p>
                <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                  {formatDate(grant?.synopsis?.responseDate)}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3 px-5 py-4 sm:px-6">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-200">
                <FiDollarSign className="h-4 w-4" />
              </span>
              <div>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Award Ceiling
                </p>
                <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                  {grant?.synopsis?.awardCeilingFormatted
                    ? `$${grant.synopsis.awardCeilingFormatted}`
                    : "Not specified"}
                </p>
              </div>
            </div>
          </div>

          {/* Tabs */}
          <div className="border-b border-slate-200 dark:border-slate-700">
            <nav
              className="flex overflow-x-auto px-4"
              aria-label="Grant sections"
            >
              {TABS.map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={`shrink-0 border-b-2 px-4 py-3.5 text-sm font-medium whitespace-nowrap transition-colors ${
                    activeTab === tab.key
                      ? "border-primary-600 text-primary-700 dark:border-primary-400 dark:text-primary-300"
                      : "border-transparent text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </nav>
          </div>

          {/* Tab Content */}
          <div className="p-5 sm:p-7">
            {/* Summary */}
            {activeTab === "summary" && (
              <div>
                <h2 className="mb-4 text-sm font-semibold tracking-wider text-slate-400 uppercase dark:text-slate-500">
                  Description
                </h2>
                {grant?.synopsis?.synopsisDesc ? (
                  <TruncatedText
                    text={stripHtml(grant.synopsis.synopsisDesc)}
                    maxLength={500}
                    id="synopsis"
                  />
                ) : (
                  <p className="text-sm text-slate-400 italic dark:text-slate-500">
                    No description available.
                  </p>
                )}
              </div>
            )}

            {/* Dates & Details */}
            {activeTab === "details" && (
              <div className="space-y-6">
                <div>
                  <h2 className="mb-4 text-sm font-semibold tracking-wider text-slate-400 uppercase dark:text-slate-500">
                    Important Dates
                  </h2>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                    {[
                      {
                        icon: <FiCalendar className="h-4 w-4" />,
                        label: "Posted",
                        value: formatDate(grant?.synopsis?.postingDate),
                      },
                      {
                        icon: <FiClock className="h-4 w-4" />,
                        label: "Response Due",
                        value: formatDate(grant?.synopsis?.responseDate),
                      },
                      {
                        icon: <FiArchive className="h-4 w-4" />,
                        label: "Archive Date",
                        value: formatDate(grant?.synopsis?.archiveDate),
                      },
                    ].map(({ icon, label, value }) => (
                      <div
                        key={label}
                        className="rounded-xl border border-slate-200 bg-slate-50/60 p-4 dark:border-slate-700/80 dark:bg-slate-800/30"
                      >
                        <div className="mb-1.5 flex items-center gap-2 text-xs font-medium text-slate-500 dark:text-slate-400">
                          {icon}
                          {label}
                        </div>
                        <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                          {value}
                        </p>
                        {label === "Response Due" &&
                          dueRemainingDays !== null &&
                          dueRemainingDays >= 0 && (
                            <div className="mt-2">{deadlineBadge}</div>
                          )}
                      </div>
                    ))}
                  </div>
                </div>

                {grant?.synopsis?.awardCeilingFormatted && (
                  <div>
                    <h2 className="mb-4 text-sm font-semibold tracking-wider text-slate-400 uppercase dark:text-slate-500">
                      Award Information
                    </h2>
                    <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50/60 px-5 py-4 dark:border-slate-700/80 dark:bg-slate-800/30">
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-200">
                        <FiDollarSign className="h-4 w-4" />
                      </span>
                      <div>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          Award Ceiling
                        </p>
                        <p className="text-xl font-bold text-slate-900 dark:text-white">
                          ${grant.synopsis.awardCeilingFormatted}
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Agency Info */}
            {activeTab === "agency" && (
              <div className="space-y-5">
                <h2 className="text-sm font-semibold tracking-wider text-slate-400 uppercase dark:text-slate-500">
                  Agency Information
                </h2>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-4 dark:border-slate-700/80 dark:bg-slate-800/30">
                    <p className="mb-1 text-xs text-slate-500 dark:text-slate-400">
                      Agency
                    </p>
                    <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                      {grant?.synopsis?.agencyName ||
                        grant?.agencyDetails?.agencyName ||
                        "N/A"}
                    </p>
                  </div>
                  <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-4 dark:border-slate-700/80 dark:bg-slate-800/30">
                    <p className="mb-1 text-xs text-slate-500 dark:text-slate-400">
                      Department
                    </p>
                    <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                      {grant?.topAgencyDetails?.agencyName || "N/A"}
                    </p>
                  </div>
                </div>

                {(grant?.synopsis?.agencyContactDesc ||
                  grant?.synopsis?.agencyContactEmail ||
                  grant?.synopsis?.agencyContactPhone) && (
                  <div>
                    <h2 className="mb-3 text-sm font-semibold tracking-wider text-slate-400 uppercase dark:text-slate-500">
                      Contact
                    </h2>
                    <div className="space-y-3">
                      {grant.synopsis?.agencyContactDesc && (
                        <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-4 dark:border-slate-700/80 dark:bg-slate-800/30">
                          <p className="text-sm text-slate-700 dark:text-slate-300">
                            {stripHtml(grant.synopsis.agencyContactDesc)}
                          </p>
                        </div>
                      )}
                      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                        {grant.synopsis?.agencyContactEmail && (
                          <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50/60 p-4 dark:border-slate-700/80 dark:bg-slate-800/30">
                            <FiMail className="h-4 w-4 shrink-0 text-slate-400 dark:text-slate-500" />
                            <div className="min-w-0">
                              <p className="mb-0.5 text-xs text-slate-500 dark:text-slate-400">
                                Email
                              </p>
                              <Link
                                href={`mailto:${grant.synopsis.agencyContactEmail}`}
                                className="truncate text-sm font-medium"
                              >
                                {grant.synopsis.agencyContactEmail}
                              </Link>
                            </div>
                          </div>
                        )}
                        {grant.synopsis?.agencyContactPhone && (
                          <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50/60 p-4 dark:border-slate-700/80 dark:bg-slate-800/30">
                            <FiPhone className="h-4 w-4 shrink-0 text-slate-400 dark:text-slate-500" />
                            <div>
                              <p className="mb-0.5 text-xs text-slate-500 dark:text-slate-400">
                                Phone
                              </p>
                              <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
                                {grant.synopsis.agencyContactPhone}
                              </p>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Eligibility */}
            {activeTab === "eligibility" && (
              <div>
                <h2 className="mb-4 text-sm font-semibold tracking-wider text-slate-400 uppercase dark:text-slate-500">
                  Eligibility Requirements
                </h2>
                {grant?.synopsis?.applicantEligibilityDesc ? (
                  <TruncatedText
                    text={stripHtml(grant.synopsis.applicantEligibilityDesc)}
                    maxLength={500}
                    id="eligibility"
                  />
                ) : (
                  <p className="text-sm text-slate-400 italic dark:text-slate-500">
                    Eligibility requirements not specified.
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 bg-slate-50/60 px-5 py-4 sm:px-7 dark:border-slate-700 dark:bg-slate-900/40">
            <Button
              variant="outline"
              size="sm"
              startIcon={<FiArrowLeft className="h-4 w-4" />}
              onClick={() => router.back()}
            >
              Back to Grants
            </Button>
            <div className="flex flex-wrap items-center gap-2">
              {user && id && (
                <Button
                  size="sm"
                  variant="outline"
                  intent={isInWishlist(id) ? "danger" : "default"}
                  onClick={() =>
                    isInWishlist(id)
                      ? removeFromWishlist(user.id, id)
                      : addToWishlist(user.id, id)
                  }
                  className={
                    isInWishlist(id)
                      ? "border-red-300 bg-red-50 text-red-700 hover:bg-red-100 dark:border-red-800 dark:bg-red-900/30 dark:text-red-300 dark:hover:bg-red-900/50"
                      : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
                  }
                  startIcon={
                    isInWishlist(id) ? (
                      <BookmarkSolid className="h-3.5 w-3.5 shrink-0" />
                    ) : (
                      <BookmarkOutline className="h-3.5 w-3.5 shrink-0" />
                    )
                  }
                >
                  {isInWishlist(id)
                    ? "Remove from Wishlist"
                    : "Save to Wishlist"}
                </Button>
              )}
              <Button
                href={`https://www.grants.gov/search-results-detail/${grant?.id != null ? Number(grant.id) : ""}`}
                target="_blank"
                intent="primary"
                size="sm"
                startIcon={<FiExternalLink className="h-4 w-4" />}
              >
                View on Grants.gov
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GrantDetail;
