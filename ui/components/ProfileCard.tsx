"use client";

import { type FC } from "react";
import type { Collaborator } from "../store/useCollaborator";
import { HiChevronRight, HiMail, HiOfficeBuilding } from "react-icons/hi";
import { FaLinkedin, FaOrcid, FaTwitter } from "react-icons/fa";
import { SiGooglescholar } from "react-icons/si";
import Badge from "./ui/Badge";
import { getCollaboratorStatus } from "../data/profile";
import Button from "@/components/ui/Button";
import { getSearchTokens, highlightText } from "@/lib/searchHighlight";
import Avatar from "./Avatar";

const truncateBio = (bio: string, maxLength: number = 160): string => {
  if (!bio || bio.length <= maxLength) return bio;
  return `${bio.substring(0, maxLength)}...`;
};

const hasAnyDetails = (c: Collaborator) => {
  return Boolean(
    (c.bio && c.bio.trim()) ||
    (c.title && c.title.trim()) ||
    (c.institution && c.institution.trim()) ||
    (c.department && c.department.trim()) ||
    (Array.isArray(c.research_interests) && c.research_interests.length > 0) ||
    (c.email && c.email.trim()) ||
    (c.linkedin_url && c.linkedin_url.trim()) ||
    (c.google_scholar_url && c.google_scholar_url.trim()) ||
    (c.twitter_handle && c.twitter_handle.trim()) ||
    (c.orcid_id && c.orcid_id.trim())
  );
};

const collaboratorMatchFields = (
  collaborator: Collaborator,
  query?: string
): string[] => {
  const tokens = getSearchTokens(query);
  if (tokens.length === 0) return [];

  const fields: Array<{ key: string; value?: string | null }> = [
    { key: "id", value: String(collaborator.id ?? "") },
    {
      key: "name",
      value: `${collaborator.first_name ?? ""} ${collaborator.last_name ?? ""}`,
    },
    { key: "title", value: collaborator.title },
    { key: "institution", value: collaborator.institution },
    { key: "department", value: collaborator.department },
    { key: "bio", value: collaborator.bio },
    {
      key: "research interests",
      value: Array.isArray(collaborator.research_interests)
        ? collaborator.research_interests.join(" ")
        : "",
    },
  ];

  return fields
    .filter((f) => {
      const text = (f.value ?? "").toLowerCase();
      return tokens.some((token) => text.includes(token));
    })
    .map((f) => f.key);
};

/* ── Social link row ──────────────────────────────────────────────── */

const socialLinkClass =
  "flex items-center justify-center rounded-lg p-2 text-slate-400 transition-colors duration-150 hover:bg-slate-100 hover:text-slate-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-400 dark:text-slate-500 dark:hover:bg-slate-700/50 dark:hover:text-slate-200";

const SocialLinks: FC<{ collaborator: Collaborator }> = ({ collaborator }) => (
  <div className="mt-4 flex flex-wrap items-center gap-0.5 border-t border-slate-100 pt-3.5 dark:border-slate-800">
    {collaborator.linkedin_url && (
      <a
        href={collaborator.linkedin_url}
        target="_blank"
        rel="noopener noreferrer"
        className={socialLinkClass}
        onClick={(e) => e.stopPropagation()}
        aria-label="LinkedIn Profile"
      >
        <FaLinkedin className="h-4 w-4" />
      </a>
    )}
    {collaborator.google_scholar_url && (
      <a
        href={collaborator.google_scholar_url}
        target="_blank"
        rel="noopener noreferrer"
        className={socialLinkClass}
        onClick={(e) => e.stopPropagation()}
        aria-label="Google Scholar Profile"
      >
        <SiGooglescholar className="h-4 w-4" />
      </a>
    )}
    {collaborator.twitter_handle && (
      <a
        href={`https://twitter.com/${collaborator.twitter_handle.replace("@", "")}`}
        target="_blank"
        rel="noopener noreferrer"
        className={socialLinkClass}
        onClick={(e) => e.stopPropagation()}
        aria-label="Twitter Profile"
      >
        <FaTwitter className="h-4 w-4" />
      </a>
    )}
    {collaborator.orcid_id && (
      <a
        href={`https://orcid.org/${collaborator.orcid_id}`}
        target="_blank"
        rel="noopener noreferrer"
        className={socialLinkClass}
        onClick={(e) => e.stopPropagation()}
        aria-label="ORCID Profile"
      >
        <FaOrcid className="h-4 w-4" />
      </a>
    )}
    {collaborator.email && (
      <a
        href={`mailto:${collaborator.email}`}
        className={`${socialLinkClass} ml-auto`}
        onClick={(e) => e.stopPropagation()}
        aria-label="Send Email"
      >
        <HiMail className="h-4 w-4" />
      </a>
    )}
  </div>
);

function hasAnySocialLink(c: Collaborator): boolean {
  return Boolean(
    c.linkedin_url?.trim() ||
    c.google_scholar_url?.trim() ||
    c.twitter_handle?.trim() ||
    c.orcid_id?.trim() ||
    c.email?.trim()
  );
}

/* ── ProfileCard ──────────────────────────────────────────────────── */

const ProfileCard: FC<{
  collaborator: Collaborator;
  highlightQuery?: string;
  isAiResult?: boolean;
}> = ({ collaborator, highlightQuery, isAiResult = false }) => {
  const activeStatuses = getCollaboratorStatus(collaborator);
  const matchedFields = collaboratorMatchFields(collaborator, highlightQuery);

  const name =
    `${(collaborator.first_name ?? "").trim()} ${(collaborator.last_name ?? "").trim()}`.trim() ||
    "Unnamed Collaborator";

  const title = collaborator.title?.trim() ?? "";
  const institution = collaborator.institution?.trim() ?? "";
  const department = collaborator.department?.trim() ?? "";
  const orgLine =
    institution && department
      ? `${institution} · ${department}`
      : institution || department;

  const hasDetails = hasAnyDetails(collaborator);
  const hasSocial = hasAnySocialLink(collaborator);

  return (
    <article
      className={`group relative flex h-full flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm transition-all duration-250 hover:-translate-y-1 hover:shadow-md hover:shadow-slate-200/70 dark:border-slate-700/60 dark:bg-slate-800 dark:shadow-md dark:shadow-black/30 dark:hover:shadow-lg dark:hover:shadow-black/50`}
      aria-label={`Profile card for ${name}`}
    >
      {/* Header */}
      <div className="border-b border-slate-100 bg-slate-800 px-5 py-4 dark:border-slate-800">
        <div className="flex items-start gap-3.5">
          <Avatar
            userId={String(collaborator.id ?? "")}
            name={name}
            firstName={collaborator.first_name}
            lastName={collaborator.last_name}
            profileTitle={title}
            src={collaborator.profile_image_url}
            href={`/profile?id=${encodeURIComponent(String(collaborator.id ?? ""))}`}
            title="View profile"
            size={44}
            className="rounded-lg hover:opacity-90"
            textClassName="text-sm font-semibold"
          />

          <div className="min-w-0 flex-1">
            <h3 className="truncate text-base font-semibold tracking-tight text-slate-900 dark:text-slate-100">
              {highlightText(name, highlightQuery)}
            </h3>
            <p className="mt-0.5 truncate text-xs font-medium text-slate-600 dark:text-slate-400">
              {title ? highlightText(title, highlightQuery) : "Researcher"}
            </p>
            {orgLine && (
              <div className="mt-1 flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                <HiOfficeBuilding className="h-3 w-3 shrink-0" />
                <span className="truncate">
                  {highlightText(orgLine, highlightQuery)}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="flex flex-1 flex-col px-5 py-4">
        {/* Search match chips */}
        {!!highlightQuery?.trim() && (
          <div className="mb-3 flex flex-wrap items-center gap-1.5">
            <span className="text-[10px] font-semibold tracking-wider text-slate-400 uppercase dark:text-slate-500">
              {isAiResult ? "AI matched" : "Matched"} in
            </span>
            {matchedFields.length > 0 ? (
              matchedFields.slice(0, 3).map((field) => (
                <span
                  key={field}
                  className="rounded-md border border-amber-200 bg-amber-50 px-1.5 py-0.5 text-[10px] font-semibold text-amber-700 dark:border-amber-700/50 dark:bg-amber-900/20 dark:text-amber-300"
                >
                  {field}
                </span>
              ))
            ) : (
              <span className="rounded-md border border-amber-200 bg-amber-50 px-1.5 py-0.5 text-[10px] font-semibold text-amber-700 dark:border-amber-700/50 dark:bg-amber-900/20 dark:text-amber-300">
                semantic profile similarity
              </span>
            )}
          </div>
        )}

        {/* Status badges */}
        {activeStatuses.length > 0 && (
          <div className="mb-3.5 flex flex-wrap gap-1.5">
            {activeStatuses.slice(0, 3).map((status) => (
              <Badge
                icon={<status.icon className="h-3 w-3" />}
                key={status.key}
              >
                {status.label}
              </Badge>
            ))}
            {activeStatuses.length > 3 && (
              <Badge color="gray">+{activeStatuses.length - 3}</Badge>
            )}
          </div>
        )}

        {/* Content */}
        {!hasDetails ? (
          <p className="text-xs text-slate-400 dark:text-slate-500">
            Profile details not yet added.
          </p>
        ) : (
          <>
            {collaborator.bio?.trim() && (
              <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-300">
                {highlightText(truncateBio(collaborator.bio), highlightQuery)}
              </p>
            )}

            {Array.isArray(collaborator.research_interests) &&
              collaborator.research_interests.length > 0 && (
                <div className={collaborator.bio?.trim() ? "mt-4" : ""}>
                  <p className="mb-2 text-[10px] font-semibold tracking-widest text-slate-400 uppercase dark:text-slate-500">
                    Research Interests
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {collaborator.research_interests
                      .slice(0, 4)
                      .map((interest, idx) => (
                        <span
                          key={`${interest}-${idx}`}
                          className="rounded-md border border-slate-200 bg-slate-50 px-2 py-0.5 text-xs font-medium text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
                        >
                          {highlightText(interest, highlightQuery)}
                        </span>
                      ))}
                    {collaborator.research_interests.length > 4 && (
                      <span className="rounded-md border border-slate-200 bg-slate-50 px-2 py-0.5 text-xs font-medium text-slate-400 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-500">
                        +{collaborator.research_interests.length - 4}
                      </span>
                    )}
                  </div>
                </div>
              )}

            {hasSocial && <SocialLinks collaborator={collaborator} />}
          </>
        )}

        {/* Spacer */}
        <div className="flex-1" />

        {/* CTA */}
        <div className="mt-4 border-t border-slate-100 pt-3.5 dark:border-slate-800">
          <Button
            variant="outline"
            size="sm"
            href={`/profile?id=${encodeURIComponent(String(collaborator.id ?? ""))}`}
            endIcon={<HiChevronRight className="h-3.5 w-3.5" />}
            className="w-full justify-center text-xs font-semibold"
          >
            View Profile
          </Button>
        </div>
      </div>
    </article>
  );
};

export default ProfileCard;
