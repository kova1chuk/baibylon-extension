import type { CaptionTrack } from "./captions";

const REQUEST_TRACKS_EVENT = "vocairo:yt:requestCaptions";
const TRACKS_RESPONSE_EVENT = "vocairo:yt:captionsResponse";
const SET_TRACK_EVENT = "vocairo:yt:setCaptionTrack";
const SET_TRACK_RESPONSE_EVENT = "vocairo:yt:setCaptionTrackResponse";
const RESPONSE_TIMEOUT_MS = 4000;

// content.js runs in the isolated world and cannot read the player element's custom JS methods
// (getPlayerResponse, setOption, …) directly; youtubeBridge.js (declared "world": "MAIN" in the
// manifest) can, and answers over CustomEvent pairs on `document`, the one channel both worlds share.
export function requestCaptionTracks(): Promise<CaptionTrack[]> {
  return new Promise((resolve) => {
    const requestId = Math.random().toString(36).slice(2);
    let settled = false;

    const settle = (tracks: CaptionTrack[]) => {
      if (settled) return;
      settled = true;
      document.removeEventListener(TRACKS_RESPONSE_EVENT, onResponse);
      window.clearTimeout(timer);
      resolve(tracks);
    };

    function onResponse(event: Event) {
      const detail = (event as CustomEvent<{ requestId: string; tracks: CaptionTrack[] }>).detail;
      if (detail?.requestId === requestId)
        settle(Array.isArray(detail.tracks) ? detail.tracks : []);
    }

    // If youtubeBridge.js hasn't attached yet (very first paint), this simply times out and the
    // caller's retry loop tries again on the next tick.
    const timer = window.setTimeout(() => settle([]), RESPONSE_TIMEOUT_MS);
    document.addEventListener(TRACKS_RESPONSE_EVENT, onResponse);
    document.dispatchEvent(new CustomEvent(REQUEST_TRACKS_EVENT, { detail: { requestId } }));
  });
}

// Resolves true once the MAIN-world bridge found a player element and called setOption on it.
// That's "we asked the player to switch tracks", not "YouTube confirmed the switch" — the player
// doesn't hand back that confirmation, so this is the most honest signal available.
export function setCaptionTrack(
  track: Pick<CaptionTrack, "languageCode" | "isAsr">,
): Promise<boolean> {
  return new Promise((resolve) => {
    const requestId = Math.random().toString(36).slice(2);
    let settled = false;

    const settle = (ok: boolean) => {
      if (settled) return;
      settled = true;
      document.removeEventListener(SET_TRACK_RESPONSE_EVENT, onResponse);
      window.clearTimeout(timer);
      resolve(ok);
    };

    function onResponse(event: Event) {
      const detail = (event as CustomEvent<{ requestId: string; ok: boolean }>).detail;
      if (detail?.requestId === requestId) settle(Boolean(detail.ok));
    }

    const timer = window.setTimeout(() => settle(false), RESPONSE_TIMEOUT_MS);
    document.addEventListener(SET_TRACK_RESPONSE_EVENT, onResponse);
    document.dispatchEvent(
      new CustomEvent(SET_TRACK_EVENT, {
        detail: { requestId, languageCode: track.languageCode, isAsr: track.isAsr },
      }),
    );
  });
}
