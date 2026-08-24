export const DEFAULT_API_BASE_URL = "https://word-flow-ai-tutor-nest-production.up.railway.app";

export function resolveApiBaseUrl(configured?: string): string {
  const value = configured?.trim() || DEFAULT_API_BASE_URL;
  const url = new URL(value);
  const isLoopback =
    url.hostname === "localhost" || url.hostname === "127.0.0.1" || url.hostname === "[::1]";
  if (url.protocol !== "https:" && !(url.protocol === "http:" && isLoopback)) {
    throw new Error(
      "VITE_VOCAIRO_API_URL must use HTTPS (HTTP is allowed only for loopback development)",
    );
  }
  if (url.username || url.password || url.search || url.hash) {
    throw new Error("VITE_VOCAIRO_API_URL cannot contain credentials, a query, or a fragment");
  }
  return `${url.origin}${url.pathname.replace(/\/+$/, "")}`;
}
