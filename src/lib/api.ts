import type {
  DeviceStart,
  DeviceTokenResult,
  LookupResult,
  PassageResult,
  Selection,
} from "./types";

export const BASE_URL = "https://word-flow-ai-tutor-nest-production.up.railway.app";

const LEXICAL_SURFACE_PATTERN = /^\p{L}[\p{L}\p{M}'’-]*$/u;
const MAX_LEXICAL_SURFACE_LENGTH = 80;
const MAX_PASSAGE_LENGTH = 20_000;

export type ApiErrorKind = "network" | "notSignedIn" | "unauthorized" | "http";

export class ApiError extends Error {
  constructor(
    readonly kind: ApiErrorKind,
    readonly status?: number,
    message?: string,
  ) {
    super(message ?? kind);
  }
}

function extractMessage(payload: unknown): string | undefined {
  return payload &&
    typeof payload === "object" &&
    typeof (payload as { message?: unknown }).message === "string"
    ? (payload as { message: string }).message
    : undefined;
}

export function unwrap<T>(payload: unknown): T {
  if (
    payload !== null &&
    typeof payload === "object" &&
    (payload as { success?: unknown }).success === true &&
    "data" in payload
  ) {
    return (payload as { data: T }).data;
  }
  return payload as T;
}

// A plain slice can land between a surrogate pair's two code units; back off one unit when it would.
function truncateUtf16(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  let end = maxLength;
  const codeUnit = text.charCodeAt(end - 1);
  if (codeUnit >= 0xd800 && codeUnit <= 0xdbff) end -= 1;
  return text.slice(0, end);
}

export function classifySelection(raw: string): Selection {
  const collapsed = raw.replace(/\s+/g, " ").trim();
  if (!collapsed) return { kind: "rejected" };

  const segmenter = new Intl.Segmenter(undefined, { granularity: "word" });
  let wordLikeCount = 0;
  let token = "";
  for (const segment of segmenter.segment(collapsed)) {
    if (segment.isWordLike) {
      wordLikeCount++;
      token = segment.segment;
    }
  }

  // The server validates the whole posted surface, so send the segmenter's token (punctuation stripped), not the raw selection.
  if (
    wordLikeCount === 1 &&
    LEXICAL_SURFACE_PATTERN.test(token) &&
    token.length <= MAX_LEXICAL_SURFACE_LENGTH
  ) {
    return { kind: "word", text: token };
  }
  return { kind: "passage", text: truncateUtf16(collapsed, MAX_PASSAGE_LENGTH) };
}

export async function getToken(): Promise<string | null> {
  const { vocairoToken } = await chrome.storage.local.get("vocairoToken");
  return typeof vocairoToken === "string" && vocairoToken ? vocairoToken : null;
}

export async function setToken(token: string): Promise<void> {
  await chrome.storage.local.set({ vocairoToken: token });
}

export async function clearToken(): Promise<void> {
  await chrome.storage.local.remove("vocairoToken");
}

async function request<T>(
  path: string,
  init: { method: "GET" } | { method: "POST"; body: unknown },
  authenticated: boolean,
): Promise<T> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Accept: "application/json",
  };
  if (authenticated) {
    const token = await getToken();
    if (!token) throw new ApiError("notSignedIn");
    headers.Authorization = `Bearer ${token}`;
  }

  let response: Response;
  try {
    response = await fetch(BASE_URL + path, {
      method: init.method,
      headers,
      ...(init.method === "POST" ? { body: JSON.stringify(init.body) } : {}),
    });
  } catch {
    throw new ApiError("network");
  }

  if (response.status === 401) {
    const payload = await response.json().catch(() => null);
    if (authenticated) await clearToken();
    throw new ApiError("unauthorized", 401, extractMessage(payload));
  }
  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    throw new ApiError("http", response.status, extractMessage(payload));
  }
  return unwrap<T>(payload);
}

function post<T>(path: string, body: unknown, authenticated: boolean): Promise<T> {
  return request<T>(path, { method: "POST", body }, authenticated);
}

export function lookup(surface: string): Promise<LookupResult> {
  return post<LookupResult>("/reading/local/lookup", { surface }, true);
}

export function passage(text: string): Promise<PassageResult> {
  return post<PassageResult>("/reading/local/passage", { text }, true);
}

export function startDeviceAuth(): Promise<DeviceStart> {
  return post<DeviceStart>("/auth/device/start", { deviceName: "Chrome · Vocairo" }, false);
}

export function redeemDeviceToken(deviceCode: string): Promise<DeviceTokenResult> {
  return post<DeviceTokenResult>("/auth/device/token", { deviceCode }, false);
}

export function accountLearningLanguage(): Promise<string | null> {
  return request<{ learning_language?: string | null }>(
    "/account/profile",
    { method: "GET" },
    true,
  ).then((profile) => profile.learning_language ?? null);
}
