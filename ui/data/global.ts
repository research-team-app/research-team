const isLocalhost = process.env.NEXT_PUBLIC_IS_LOCAL === "true";

/** Set NEXT_PUBLIC_API_URL at build time (never hardcode the API Gateway URL in source). */
export const API_URL =
  (process.env.NEXT_PUBLIC_API_URL ?? "").replace(/\/$/, "") ||
  (isLocalhost ? "http://localhost:3000/api-proxy" : "");

export const REDIRECT_SIGN_IN_GOOGLE = isLocalhost
  ? "http://localhost:3000"
  : "https://research.team";
export const REDIRECT_SIGN_OUT_GOOGLE = isLocalhost
  ? "http://localhost:3000"
  : "https://research.team";
