"use client";

import { useState } from "react";
import { useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { cn } from "@/lib/utils";
import { API_URL } from "@/data/global";
import { getAuthHeaders } from "@/lib/apiAuth";

const profilePictureUrlCache = new Map<string, string | null>();

type AvatarProps = {
  userId?: string;
  name?: string;
  firstName?: string;
  lastName?: string;
  profileTitle?: string;
  src?: string;
  alt?: string;
  href?: string;
  title?: string;
  size?: number;
  className?: string;
  fallbackClassName?: string;
  textClassName?: string;
};

export function getAvatarInitials(
  name?: string,
  firstName?: string,
  lastName?: string
): string {
  const source =
    name?.trim() ||
    `${firstName ?? ""} ${lastName ?? ""}`.trim() ||
    "Researcher";
  const tokens = source.split(/\s+/).filter(Boolean);
  return ((tokens[0]?.[0] ?? "R") + (tokens[1]?.[0] ?? "")).toUpperCase();
}

export default function Avatar({
  userId,
  name,
  firstName,
  lastName,
  profileTitle,
  src,
  alt,
  href,
  title,
  size = 40,
  className,
  fallbackClassName,
  textClassName,
}: AvatarProps) {
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  const [fetchedSrc, setFetchedSrc] = useState<string | null>(null);
  useEffect(() => {
    let active = true;
    const uid = String(userId ?? "").trim();
    const directSrc = String(src ?? "").trim();

    if (!uid || directSrc)
      return () => {
        active = false;
      };

    const loadPicture = async () => {
      try {
        const headers = await getAuthHeaders();
        const cacheKey = `${uid}:${headers.Authorization ? "auth" : "public"}`;
        if (profilePictureUrlCache.has(cacheKey)) {
          if (active)
            setFetchedSrc(profilePictureUrlCache.get(cacheKey) ?? null);
          return;
        }

        const res = await fetch(
          `${API_URL}/profile_picture/${encodeURIComponent(uid)}`,
          { headers }
        );
        if (!res.ok) {
          profilePictureUrlCache.set(cacheKey, null);
          if (active) setFetchedSrc(null);
          return;
        }

        const data = (await res.json()) as { presigned_url?: string };
        const remote = String(data?.presigned_url ?? "").trim();
        const separator = remote.includes("?") ? "&" : "?";
        const withBust = remote
          ? `${remote}${separator}bust=${Date.now()}`
          : null;
        profilePictureUrlCache.set(cacheKey, withBust);
        if (active) setFetchedSrc(withBust);
      } catch {
        if (active) setFetchedSrc(null);
      }
    };

    void loadPicture();
    return () => {
      active = false;
    };
  }, [userId, src]);

  const displayName =
    name?.trim() ||
    `${firstName ?? ""} ${lastName ?? ""}`.trim() ||
    "Researcher";
  const initials = getAvatarInitials(name, firstName, lastName);
  const resolvedAlt = alt || `${displayName} profile`;
  const resolvedTitle = [title ?? displayName, profileTitle]
    .filter(Boolean)
    .join(" • ");
  const resolvedSrc = String(src ?? "").trim() || fetchedSrc || "";
  const canShowImage = Boolean(resolvedSrc && resolvedSrc !== failedSrc);

  const avatarContent = canShowImage ? (
    <Image
      src={resolvedSrc}
      alt={resolvedAlt}
      fill
      unoptimized
      className="object-cover"
      onError={() => setFailedSrc(resolvedSrc || null)}
    />
  ) : (
    <span
      className={cn(
        "theme-slate-avatar inline-flex h-full w-full items-center justify-center",
        fallbackClassName
      )}
    >
      <span className={cn("text-xs font-semibold", textClassName)}>
        {initials}
      </span>
    </span>
  );

  const sharedProps = {
    title: resolvedTitle || undefined,
    style: { width: size, height: size },
    className: cn(
      "relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full ring-1 ring-slate-200 shadow-sm dark:ring-slate-600",
      className
    ),
  };

  if (href) {
    return (
      <Link href={href} {...sharedProps}>
        {avatarContent}
      </Link>
    );
  }

  return <span {...sharedProps}>{avatarContent}</span>;
}
