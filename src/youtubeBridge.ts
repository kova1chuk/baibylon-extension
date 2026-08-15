import { parseCaptionTracks } from "./youtube/captions";

const REQUEST_TRACKS_EVENT = "vocairo:yt:requestCaptions";
const TRACKS_RESPONSE_EVENT = "vocairo:yt:captionsResponse";
const SET_TRACK_EVENT = "vocairo:yt:setCaptionTrack";
const SET_TRACK_RESPONSE_EVENT = "vocairo:yt:setCaptionTrackResponse";

interface PlayerElement extends Element {
  getPlayerResponse?: () => unknown;
  setOption?: (module: string, option: string, value: unknown) => void;
}

function getPlayer(): PlayerElement | null {
  return document.querySelector<PlayerElement>("#movie_player");
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
  const tracks = parseCaptionTracks(getFreshPlayerResponse());
  document.dispatchEvent(new CustomEvent(TRACKS_RESPONSE_EVENT, { detail: { requestId, tracks } }));
});

document.addEventListener(SET_TRACK_EVENT, (event) => {
  const detail = (event as CustomEvent<{ requestId: string; languageCode: string; isAsr: boolean }>)
    .detail;
  let ok = false;
  try {
    const player = getPlayer();
    // {languageCode, kind} mirrors the raw captionTracks fields exactly, so this picks the same
    // track selectCaptionTrack() picked instead of leaving YouTube to disambiguate on its own.
    player?.setOption?.("captions", "track", {
      languageCode: detail.languageCode,
      ...(detail.isAsr ? { kind: "asr" } : {}),
    });
    ok = Boolean(player);
  } catch {
    ok = false;
  }
  document.dispatchEvent(
    new CustomEvent(SET_TRACK_RESPONSE_EVENT, { detail: { requestId: detail.requestId, ok } }),
  );
});
