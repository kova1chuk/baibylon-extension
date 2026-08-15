import { accountLearningLanguage } from "../lib/apiBridge";
import { requestCaptionTracks, setCaptionTrack } from "./bridgeClient";
import {
  type CaptionDisplay,
  type CaptionTrackSelection,
  DEFAULT_LEARNING_LANGUAGE,
  type WordToken,
  didCaptionDisplayChange,
  diffWordTokens,
  extractVideoId,
  joinCaptionSegments,
  resolveCaptionDisplay,
  selectCaptionTrack,
  splitIntoWordTokens,
} from "./captions";

const STYLE = `
:host { all: initial; }
/* Every rule here exists to keep an on-screen word where it is; none of them are cosmetic.
   width+text-align: a centred, content-width line shifts every earlier word when one is appended.
   height: reserves two lines so a wrap grows downward instead of shoving the first line up.
   text-wrap: the pretty/balance modes may re-break earlier lines once later words arrive.
   pointer-events: the reserved box is mostly empty, so only .word may take clicks off the player. */
.bar {
  position: absolute; left: 50%; bottom: 64px; transform: translateX(-50%);
  width: 80%; height: 2.8em; pointer-events: none;
  color: #fff;
  font: 500 18px/1.4 -apple-system, system-ui, sans-serif;
  text-align: left; text-wrap: wrap;
}
/* Inline, not painted on .bar: the fixed-size box would otherwise be a permanent slab over the video. */
.plate {
  padding: 2px 10px; border-radius: 6px; background: rgba(0,0,0,.75);
  -webkit-box-decoration-break: clone; box-decoration-break: clone;
}
.word { cursor: pointer; border-radius: 3px; padding: 0 1px; pointer-events: auto; }
.word:hover { background: rgba(255,255,255,.25); text-decoration: underline; }
.message { opacity: .8; font-style: italic; }
.hidden { display: none; }
`;

interface SubtitleBar {
  render(display: CaptionDisplay): void;
  destroy(): void;
}

// Bound once at mount, not per render: a reused token node keeps the listener it was created with.
function mountSubtitleBar(
  playerEl: Element,
  onWordClick: (word: string, x: number, y: number) => void,
): SubtitleBar {
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
  const lineEl = document.createElement("span");
  lineEl.className = "plate line hidden";
  const messageEl = document.createElement("span");
  messageEl.className = "plate message hidden";
  bar.append(lineEl, messageEl);
  root.append(style, bar);
  playerEl.append(host);

  // Mirrors lineEl's children exactly; nothing else ever writes to lineEl, so the diff can trust it.
  let renderedTokens: WordToken[] = [];

  function createTokenSpan(token: WordToken): HTMLSpanElement {
    const span = document.createElement("span");
    // textContent, never innerHTML: a caption line is mirrored straight out of the page's DOM, so
    // it gets the same treatment as any untrusted string.
    span.textContent = token.text;
    if (token.clickable) {
      span.className = "word";
      span.addEventListener("click", (event) => {
        event.stopPropagation();
        onWordClick(token.text, event.clientX, event.clientY);
      });
    }
    return span;
  }

  function renderTokens(text: string): void {
    const tokens = text ? splitIntoWordTokens(text) : [];
    for (const op of diffWordTokens(renderedTokens, tokens)) {
      if (op.type === "truncate") {
        for (const stale of Array.from(lineEl.children).slice(op.keep)) stale.remove();
      } else {
        for (const token of op.tokens) lineEl.append(createTokenSpan(token));
      }
    }
    renderedTokens = tokens;
  }

  function showMessage(text: string): void {
    renderTokens("");
    messageEl.textContent = text;
    lineEl.classList.add("hidden");
    messageEl.classList.remove("hidden");
    bar.classList.remove("hidden");
  }

  return {
    render(display) {
      switch (display.kind) {
        case "enableFailed":
          showMessage("Не вдалося увімкнути субтитри для цього відео");
          return;
        case "unavailable":
          showMessage("У цього відео немає субтитрів");
          return;
        case "wrongLanguage":
          showMessage(
            `Немає субтитрів потрібною мовою. Показано: ${display.shownLanguageName} — ${display.text}`,
          );
          return;
        case "empty":
          renderTokens("");
          bar.classList.add("hidden");
          return;
        case "line":
          renderTokens(display.text);
          messageEl.classList.add("hidden");
          lineEl.classList.remove("hidden");
          bar.classList.remove("hidden");
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
      bar.render(display);
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
      bar?.render({ kind: "empty" });
      if (videoId) void loadCaptionsFor(generation);
    }

    const playerEl = onWatchPage ? document.querySelector("#movie_player") : null;

    if (playerEl && !bar) {
      bar = mountSubtitleBar(playerEl, onWordClick);
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
