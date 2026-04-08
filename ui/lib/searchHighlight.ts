import { Fragment, createElement, type ReactNode } from "react";

export const escapeRegex = (value: string) =>
  value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

export const getSearchTokens = (query?: string): string[] => {
  if (!query?.trim()) return [];
  return Array.from(
    new Set(
      query
        .trim()
        .toLowerCase()
        .split(/\s+/)
        .map((t) => t.replace(/[^a-z0-9-]/gi, ""))
        .filter((t) => t.length >= 2)
    )
  );
};

export const highlightText = (value: string, query?: string): ReactNode => {
  const text = value ?? "";
  const tokens = getSearchTokens(query);
  if (!text || tokens.length === 0) return text;

  const pattern = tokens.map(escapeRegex).join("|");
  const regex = new RegExp(`(${pattern})`, "gi");
  const parts = text.split(regex);

  return parts.map((part, idx) => {
    if (!part) return null;
    const isMatch = tokens.some((token) => part.toLowerCase() === token);
    if (!isMatch)
      return createElement(Fragment, { key: `${part}-${idx}` }, part);
    return createElement(
      "mark",
      {
        key: `${part}-${idx}`,
        className:
          "rounded-sm bg-amber-100 px-0.5 text-amber-900 dark:bg-amber-400/25 dark:text-amber-200",
      },
      part
    );
  });
};
