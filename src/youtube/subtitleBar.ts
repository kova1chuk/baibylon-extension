import { accountLearningLanguage } from "../lib/api";
import { requestCaptionTracks, setCaptionTrack } from "./bridgeClient";
import {
  type CaptionDisplay,
  type CaptionTrackSelection,
  DEFAULT_LEARNING_LANGUAGE,
  didCaptionDisplayChange,
  extractVideoId,
  joinCaptionSegments,
  resolveCaptionDisplay,
  selectCaptionTrack,
  splitIntoWordTokens,
} from "./captions";

const STYLE = `
:host { all: initial; }
.bar {
  position: absolute; left: 50%; bottom: 64px; transform: translateX(-50%);
  max-width: 88%; pointer-events: auto;
  padding: 6px 14px; border-radius: 6px;
  background: rgba(0,0,0,.75); color: #fff;
  font: 500 18px/1.4 -apple-system, system-ui, sans-serif;
  text-align: center;
}
.word { cursor: pointer; border-radius: 3px; padding: 0 1px; }
.word:hover { background: rgba(255,255,255,.25); text-decoration: underline; }
.message { opacity: .8; font-style: italic; }
.hidden { display: none; }
`;

interface SubtitleBar {
  render(display: CaptionDisplay, onWordClick: (word: string, x: number, y: number) => void): void;
  destroy(): void;
}

function renderMessage(bar: HTMLElement, text: string): void {
  bar.classList.remove("hidden");
  const span = document.createElement("span");
  span.className = "message";
  // textContent, never innerHTML: this text is either our own copy or a caption line mirrored
  // straight out of the page's DOM, so it gets the same treatment as any untrusted string.
  span.textContent = text;
  bar.append(span);
}

function mountSubtitleBar(playerEl: Element): SubtitleBar {
  const host = document.createElement("div");
  // Same hostile-page-CSS defense as content/card.ts's mountCard: !important is the only thing
  // that outranks a page rule like `* { all: unset !important }`.
  host.style.setProperty("all", "initial", "important");
  host.style.setProperty("position", "absolute", "important");
  host.style.setProperty("inset", "0", "important");
  host.style.setProperty("pointer-events", "none", "important");
  host.style.setProperty("z-index", "60", "important");
  const root = host.attachShadow({ mode: "closed" });
  const style = document.createElement("style");
  style.textContent = STYLE;
  const bar = document.createElement("div");
  bar.className = "bar hidden";
  root.append(style, bar);
  playerEl.append(host);

  return {
    render(display, onWordClick) {
      bar.replaceChildren();
      switch (display.kind) {
        case "enableFailed":
          renderMessage(bar, "Не вдалося увімкнути субтитри для цього відео");
          return;
        case "unavailable":
          renderMessage(bar, "У цього відео немає субтитрів");
          return;
        case "empty":
          bar.classList.add("hidden");
          return;
        case "wrongLanguage":
          renderMessage(
            bar,
            `Немає субтитрів потрібною мовою. Показано: ${display.shownLanguageName} — ${display.text}`,
          );
          return;
        case "line":
          bar.classList.remove("hidden");
          for (const token of splitIntoWordTokens(display.text)) {
            const span = document.createElement("span");
            span.textContent = token.text;
            if (token.clickable) {
              span.className = "word";
              span.addEventListener("click", (event) => {
                event.stopPropagation();
                onWordClick(token.text, event.clientX, event.clientY);
              });
            }
            bar.append(span);
          }
          return;
      }
    },
    destroy() {
      host.remove();
    },
  };
}

const CAPTIONS_BUTTON_SELECTOR = ".ytp-subtitles-button";
const CAPTION_SEGMENT_SELECTOR = ".ytp-caption-segment";

function findCaptionsButton(playerEl: Element): HTMLButtonElement | null {
  return playerEl.querySelector<HTMLButtonElement>(CAPTIONS_BUTTON_SELECTOR);
}

function readCurrentCaptionText(playerEl: Element): string {
  const segments = Array.from(playerEl.querySelectorAll<HTMLElement>(CAPTION_SEGMENT_SELECTOR));
  return joinCaptionSegments(segments.map((segment) => segment.textContent ?? ""));
}

let learningLanguagePromise: Promise<string> | null = null;

// The account is the authority, but it needs the network and a signed-in token, so the last good
// answer is cached locally and used whenever the request cannot be made or fails.
function getLearningLanguage(): Promise<string> {
  learningLanguagePromise ??= accountLearningLanguage()
    .then((language) => {
      if (!language) throw new Error("no learning language on the profile");
      void chrome.storage.local.set({ vocairoLearningLanguage: language });
      return language;
    })
    .catch(() =>
      chrome.storage.local
        .get("vocairoLearningLanguage")
        .then(({ vocairoLearningLanguage }) =>
          typeof vocairoLearningLanguage === "string" && vocairoLearningLanguage
            ? vocairoLearningLanguage
            : DEFAULT_LEARNING_LANGUAGE,
        )
        .catch(() => DEFAULT_LEARNING_LANGUAGE),
    );
  return learningLanguagePromise;
}

const NAV_POLL_MS = 750;
const CAPTION_RETRY_DELAY_MS = 500;
const CAPTION_RETRY_ATTEMPTS = 4;
const CAPTION_APPEAR_TIMEOUT_MS = 4000;
const MAX_CAPTION_TOGGLE_ATTEMPTS = 3;

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

export function initYoutubeSubtitles(
  onWordClick: (word: string, x: number, y: number) => void,
): void {
  let lastVideoId: string | null = null;
  let generation = 0;
  let bar: SubtitleBar | null = null;
  let captionObserver: MutationObserver | null = null;
  let selection: CaptionTrackSelection = { status: "unavailable" };
  let lastDisplay: CaptionDisplay | null = null;
  // aria-pressed on the CC button lies on load (reads "true" while nothing renders), so a caption
  // segment actually appearing is the only evidence "enabled" ever gets. These three reset together
  // on every video change, right alongside `generation`.
  let captionSeen = false;
  let captionToggleAttempts = 0;
  let waitingForCaptionSince: number | null = null;

  function syncCaptionDisplay(playerEl: Element) {
    if (!bar) return;
    const text = readCurrentCaptionText(playerEl);
    if (text.trim()) captionSeen = true;
    const enableFailed = !captionSeen && captionToggleAttempts >= MAX_CAPTION_TOGGLE_ATTEMPTS;
    const display = resolveCaptionDisplay(enableFailed, selection, text);
    if (didCaptionDisplayChange(lastDisplay, display)) {
      lastDisplay = display;
      bar.render(display, onWordClick);
    }
  }

  // Clicks the CC button as a last resort when a track is selected, the video is playing, and no
  // caption segment has shown up for a few seconds — bounded so a video that truly never renders
  // captions (confirmed live: track selected, setOption succeeds, still nothing) doesn't get
  // fought forever, and neither does a user who deliberately toggles captions back off.
  function maybeToggleCaptions(playerEl: Element) {
    if (selection.status === "unavailable") return;
    if (captionSeen || captionToggleAttempts >= MAX_CAPTION_TOGGLE_ATTEMPTS) return;

    const video = document.querySelector<HTMLVideoElement>("#movie_player video");
    if (!video || video.paused) {
      waitingForCaptionSince = null;
      return;
    }

    const now = Date.now();
    waitingForCaptionSince ??= now;
    if (now - waitingForCaptionSince < CAPTION_APPEAR_TIMEOUT_MS) return;

    const button = findCaptionsButton(playerEl);
    if (!button) return;
    button.click();
    captionToggleAttempts++;
    waitingForCaptionSince = now;
  }

  async function loadCaptionsFor(myGeneration: number) {
    const targetLanguage = await getLearningLanguage();
    if (myGeneration !== generation) return;

    for (let attempt = 0; attempt < CAPTION_RETRY_ATTEMPTS; attempt++) {
      if (myGeneration !== generation) return;
      const tracks = await requestCaptionTracks();
      if (myGeneration !== generation) return;

      if (tracks.length > 0) {
        selection = selectCaptionTrack(tracks, targetLanguage);
        if (selection.status !== "unavailable") {
          await setCaptionTrack(selection.track);
          if (myGeneration !== generation) return;
        }
        const playerEl = document.querySelector("#movie_player");
        if (playerEl) syncCaptionDisplay(playerEl);
        return;
      }

      // Empty on the first tries can just mean the player element hasn't finished loading the
      // video yet — retry a bounded number of times before concluding the video truly has no captions.
      if (attempt < CAPTION_RETRY_ATTEMPTS - 1) await delay(CAPTION_RETRY_DELAY_MS);
    }
    selection = { status: "unavailable" };
    const playerEl = document.querySelector("#movie_player");
    if (playerEl) syncCaptionDisplay(playerEl);
  }

  function tick() {
    const onWatchPage = location.hostname === "www.youtube.com" && location.pathname === "/watch";
    const videoId = onWatchPage ? extractVideoId(location.href) : null;

    if (videoId !== lastVideoId) {
      lastVideoId = videoId;
      generation++;
      selection = { status: "unavailable" };
      lastDisplay = null;
      captionSeen = false;
      captionToggleAttempts = 0;
      waitingForCaptionSince = null;
      bar?.render({ kind: "empty" }, onWordClick);
      if (videoId) void loadCaptionsFor(generation);
    }

    const playerEl = onWatchPage ? document.querySelector("#movie_player") : null;

    if (playerEl && !bar) {
      bar = mountSubtitleBar(playerEl);
      // Observing the stable #movie_player (not the caption window it creates/destroys/replaces
      // internally) means we never hold a reference that YouTube can invalidate out from under us —
      // every callback re-queries .ytp-caption-segment fresh.
      captionObserver = new MutationObserver(() => syncCaptionDisplay(playerEl));
      captionObserver.observe(playerEl, { childList: true, subtree: true, characterData: true });
    } else if (!playerEl && bar) {
      captionObserver?.disconnect();
      captionObserver = null;
      bar.destroy();
      bar = null;
    }

    if (playerEl) {
      maybeToggleCaptions(playerEl);
      syncCaptionDisplay(playerEl);
    }
  }

  // yt-navigate-finish fires on every YouTube SPA navigation and is the fast path; the interval
  // is a defensive backstop in case a future YouTube UI variant stops dispatching it.
  document.addEventListener("yt-navigate-finish", tick);
  window.setInterval(tick, NAV_POLL_MS);
  tick();
}
