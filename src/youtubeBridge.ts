import { parseCaptionTracklist, parseCaptionTracks } from "./youtube/captions";

const REQUEST_TRACKS_EVENT = "vocairo:yt:requestCaptions";
const TRACKS_RESPONSE_EVENT = "vocairo:yt:captionsResponse";
const SET_TRACK_EVENT = "vocairo:yt:setCaptionTrack";
const SET_TRACK_RESPONSE_EVENT = "vocairo:yt:setCaptionTrackResponse";

interface PlayerElement extends Element {
  getPlayerResponse?: () => unknown;
  setOption?: (module: string, option: string, value: unknown) => void;
  getOption?: (module: string, option: string) => unknown;
  loadModule?: (module: string) => void;
}

function getPlayer(): PlayerElement | null {
  return document.querySelector<PlayerElement>("#movie_player");
}

// The player never renders captions, and its tracklist stays empty, until this has been called
// at least once on it — verified live, not documented anywhere. Safe to call repeatedly.
function loadCaptionsModule(player: PlayerElement | null): void {
  try {
    player?.loadModule?.("captions");
  } catch {
    // Can throw while the player is still initializing; callers fall back to an empty tracklist.
  }
}

function getLiveTracklist(player: PlayerElement | null): unknown[] {
  try {
    const tracklist = player?.getOption?.("captions", "tracklist");
    return Array.isArray(tracklist) ? tracklist : [];
  } catch {
    return [];
  }
}

function getFreshPlayerResponse(): unknown {
  // ytInitialPlayerResponse is only correct for the page's first video; YouTube's SPA navigation
  // never refreshes that global. The player element's own getPlayerResponse() stays in sync with
  // whatever video is actually loaded, so it's the primary source and the global is only a
  // best-effort fallback for the instant before the player element exists.
  try {
    const fromPlayer = getPlayer()?.getPlayerResponse?.();
    if (fromPlayer) return fromPlayer;
  } catch {
    // getPlayerResponse can throw while the player is mid-teardown between videos.
  }
  return (
    (window as unknown as { ytInitialPlayerResponse?: unknown }).ytInitialPlayerResponse ?? null
  );
}

document.addEventListener(REQUEST_TRACKS_EVENT, (event) => {
  const requestId = (event as CustomEvent<{ requestId: string }>).detail?.requestId;
  const player = getPlayer();
  loadCaptionsModule(player);
  const fromTracklist = parseCaptionTracklist(getLiveTracklist(player));
  // The tracklist is the source of truth once the player has one; parseCaptionTracks only
  // covers the window before the player (and thus loadModule) exists at all.
  const tracks =
    fromTracklist.length > 0 ? fromTracklist : parseCaptionTracks(getFreshPlayerResponse());
  document.dispatchEvent(new CustomEvent(TRACKS_RESPONSE_EVENT, { detail: { requestId, tracks } }));
});

document.addEventListener(SET_TRACK_EVENT, (event) => {
  const detail = (event as CustomEvent<{ requestId: string; languageCode: string; isAsr: boolean }>)
    .detail;
  let ok = false;
  try {
    const player = getPlayer();
    loadCaptionsModule(player);
    // setOption needs the actual tracklist entry object, not a synthetic {languageCode, kind}
    // reconstruction — the latter is unverified and, pre-loadModule, doesn't work at all.
    const entry = getLiveTracklist(player).find((raw) => {
      if (!raw || typeof raw !== "object") return false;
      const candidate = raw as Record<string, unknown>;
      return (
        candidate.languageCode === detail.languageCode &&
        (candidate.kind === "asr") === detail.isAsr
      );
    });
    if (entry) {
      player?.setOption?.("captions", "track", entry);
      ok = true;
    }
  } catch {
    ok = false;
  }
  document.dispatchEvent(
    new CustomEvent(SET_TRACK_RESPONSE_EVENT, { detail: { requestId: detail.requestId, ok } }),
  );
});
