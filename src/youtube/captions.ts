export interface CaptionTrack {
  languageCode: string;
  name: string;
  isAsr: boolean;
}

export interface WordToken {
  text: string;
  clickable: boolean;
}

export const DEFAULT_LEARNING_LANGUAGE = "en";

export function extractVideoId(url: string): string | null {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return null;
  }
  if (parsed.pathname === "/watch") {
    const id = parsed.searchParams.get("v");
    return id && id.length > 0 ? id : null;
  }
  // youtu.be / shorts links carry the id in the path; kept for completeness even though the
  // subtitle bar only mounts on /watch today.
  const shortMatch = /^\/shorts\/([\w-]{6,})/.exec(parsed.pathname);
  return shortMatch ? shortMatch[1] : null;
}

export function parseCaptionTracks(playerResponse: unknown): CaptionTrack[] {
  const tracks = (
    playerResponse as {
      captions?: { playerCaptionsTracklistRenderer?: { captionTracks?: unknown } };
    }
  )?.captions?.playerCaptionsTracklistRenderer?.captionTracks;
  if (!Array.isArray(tracks)) return [];

  const result: CaptionTrack[] = [];
  for (const raw of tracks) {
    if (!raw || typeof raw !== "object") continue;
    const { languageCode, name, kind } = raw as Record<string, unknown>;
    if (typeof languageCode !== "string") continue;
    const simpleText =
      name && typeof name === "object" ? (name as { simpleText?: unknown }).simpleText : undefined;
    result.push({
      languageCode,
      name: typeof simpleText === "string" ? simpleText : languageCode,
      isAsr: kind === "asr",
    });
  }
  return result;
}

// player.getOption("captions","tracklist") entries: `kind` is "" (not absent) for manual
// tracks, and `name` is always "" here (unlike playerResponse's {simpleText} shape), so the
// label falls back through displayName/languageName instead.
export function parseCaptionTracklist(tracklist: unknown): CaptionTrack[] {
  if (!Array.isArray(tracklist)) return [];

  const result: CaptionTrack[] = [];
  for (const raw of tracklist) {
    if (!raw || typeof raw !== "object") continue;
    const { languageCode, languageName, displayName, kind } = raw as Record<string, unknown>;
    if (typeof languageCode !== "string") continue;
    result.push({
      languageCode,
      name:
        (typeof displayName === "string" && displayName) ||
        (typeof languageName === "string" && languageName) ||
        languageCode,
      isAsr: kind === "asr",
    });
  }
  return result;
}

export type CaptionTrackSelection =
  | { status: "unavailable" }
  | { status: "matched"; track: CaptionTrack }
  | { status: "fallback"; track: CaptionTrack };

function baseLanguage(code: string): string {
  return (code.split("-")[0] ?? code).toLowerCase();
}

// Manual (human-authored) tracks outrank auto-generated ones whenever both exist for the same
// language, since ASR transcripts run noticeably more errors than a creator-uploaded track.
function preferManual(tracks: CaptionTrack[]): CaptionTrack {
  return [...tracks].sort((a, b) => Number(a.isAsr) - Number(b.isAsr))[0] as CaptionTrack;
}

export function selectCaptionTrack(
  tracks: CaptionTrack[],
  targetLanguage: string,
): CaptionTrackSelection {
  if (tracks.length === 0) return { status: "unavailable" };

  const target = baseLanguage(targetLanguage);
  const matches = tracks.filter((track) => baseLanguage(track.languageCode) === target);
  if (matches.length > 0) return { status: "matched", track: preferManual(matches) };

  // No track in the target language at all: fall back to the best track that does exist so the
  // bar can show *something* plus an honest "this isn't your language" label, rather than nothing.
  return { status: "fallback", track: preferManual(tracks) };
}

export function joinCaptionSegments(segments: string[]): string {
  return segments
    .map((segment) => segment.trim())
    .filter((segment) => segment.length > 0)
    .join(" ");
}

export type CaptionDisplay =
  | { kind: "unavailable" }
  | { kind: "enableFailed" }
  | { kind: "empty" }
  | { kind: "line"; text: string }
  | { kind: "wrongLanguage"; text: string; shownLanguageName: string };

// enableFailed is a decision the caller already made (retries exhausted, no caption segment ever
// seen), not something read here — aria-pressed on YouTube's CC button lies about caption state on load.
export function resolveCaptionDisplay(
  enableFailed: boolean,
  selection: CaptionTrackSelection,
  line: string,
): CaptionDisplay {
  if (selection.status === "unavailable") return { kind: "unavailable" };
  if (enableFailed) return { kind: "enableFailed" };

  const trimmed = line.trim();
  if (!trimmed) return { kind: "empty" };

  return selection.status === "matched"
    ? { kind: "line", text: trimmed }
    : { kind: "wrongLanguage", text: trimmed, shownLanguageName: selection.track.name };
}

export function didCaptionDisplayChange(
  previous: CaptionDisplay | null,
  next: CaptionDisplay,
): boolean {
  if (!previous || previous.kind !== next.kind) return true;
  if (previous.kind === "line" && next.kind === "line") return previous.text !== next.text;
  if (previous.kind === "wrongLanguage" && next.kind === "wrongLanguage") {
    return previous.text !== next.text || previous.shownLanguageName !== next.shownLanguageName;
  }
  return false;
}

export function splitIntoWordTokens(text: string): WordToken[] {
  const segmenter = new Intl.Segmenter(undefined, { granularity: "word" });
  const tokens: WordToken[] = [];
  for (const segment of segmenter.segment(text)) {
    tokens.push({ text: segment.segment, clickable: segment.isWordLike === true });
  }
  return tokens;
}
