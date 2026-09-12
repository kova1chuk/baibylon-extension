import { classifySelection } from "./lib/api";
import { lookup, passage } from "./lib/apiBridge";
import { errorText, escapeHtml, mountCard, renderLookup, renderPassage } from "./content/card";
import { VOICEWAVE_BARS, VOICEWAVE_COLORS } from "./lib/voicewave";
import { initYoutubeSubtitles } from "./youtube/subtitleBar";

declare global {
  interface Window {
    __vocairoContentScriptMounted?: boolean;
  }
}

// Background's re-injection recovery can also fire for a tab that's already mounted; guard so it's a no-op.
if (!window.__vocairoContentScriptMounted) {
  window.__vocairoContentScriptMounted = true;

  const card = mountCard();
  let button: HTMLButtonElement | null = null;

  // Tracks the exact video we paused, so dismissal only resumes playback we ourselves stopped —
  // a video the user had already paused before clicking a caption word must stay paused.
  let videoPausedByLookup: HTMLVideoElement | null = null;

  function pauseVideoForCaptionLookup() {
    const video = document.querySelector<HTMLVideoElement>("#movie_player video");
    if (video && !video.paused) {
      video.pause();
      videoPausedByLookup = video;
    }
  }

  function resumeVideoIfPausedForLookup() {
    if (!videoPausedByLookup) return;
    videoPausedByLookup.play().catch(() => {});
    videoPausedByLookup = null;
  }

  async function run(raw: string, x: number, y: number) {
    const selection = classifySelection(raw);
    if (selection.kind === "rejected") return;

    card.positionAt(x, y);
    card.show('<div class="muted">Шукаємо…</div>');
    try {
      card.show(
        selection.kind === "word"
          ? renderLookup(await lookup(selection.text))
          : renderPassage(await passage(selection.text)),
      );
    } catch (error) {
      card.show(`<div class="muted">${escapeHtml(errorText(error))}</div>`);
    }
  }

  function removeButton() {
    button?.remove();
    button = null;
  }

  function createVoicewaveMark(width: number, scheme: "light" | "dark") {
    const colors = VOICEWAVE_COLORS[scheme];
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("aria-hidden", "true");
    svg.setAttribute("viewBox", "0 0 28.2 24");
    svg.setAttribute("width", String(width));
    svg.setAttribute("height", String((width * 24) / 28.2));

    VOICEWAVE_BARS.forEach(({ x, y, height, accent, opacity }) => {
      const bar = document.createElementNS("http://www.w3.org/2000/svg", "rect");
      bar.setAttribute("x", String(x));
      bar.setAttribute("y", String(y));
      bar.setAttribute("width", "3");
      bar.setAttribute("height", String(height));
      bar.setAttribute("rx", "1.5");
      bar.setAttribute("opacity", String(opacity));
      bar.setAttribute("fill", accent ? colors.accent : colors.ink);
      svg.append(bar);
    });

    return svg;
  }

  document.addEventListener("mouseup", (event) => {
    // Selection isn't always committed yet when mouseup fires, so read it on the next tick.
    window.setTimeout(() => {
      const raw = window.getSelection()?.toString() ?? "";
      if (classifySelection(raw).kind === "rejected") {
        removeButton();
        return;
      }
      removeButton();
      const trigger = document.createElement("button");
      trigger.setAttribute("aria-label", "Vocairo: подивитися");
      trigger.append(createVoicewaveMark(22, "dark"));
      trigger.style.cssText = [
        "position:fixed",
        `left:${event.clientX + 6}px`,
        `top:${event.clientY + 6}px`,
        "z-index:2147483647",
        "width:32px;height:32px;border:0;border-radius:8px;padding:0",
        "background:#07080d;display:flex;align-items:center;justify-content:center;cursor:pointer",
      ].join(";");
      trigger.addEventListener("mousedown", (downEvent) => {
        downEvent.preventDefault();
        downEvent.stopPropagation();
        removeButton();
        void run(raw, event.clientX, event.clientY);
      });
      document.documentElement.append(trigger);
      button = trigger;
    }, 0);
  });

  document.addEventListener("mousedown", (event) => {
    // Shadow-tree presses retarget to the card's host for outside listeners, so check that too.
    if (event.target === button || card.contains(event.target)) return;
    card.hide();
    removeButton();
    resumeVideoIfPausedForLookup();
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      card.hide();
      removeButton();
      resumeVideoIfPausedForLookup();
    }
  });

  chrome.runtime.onMessage.addListener((message) => {
    if (message?.action === "vocairoShow" && typeof message.text === "string") {
      void run(message.text, window.innerWidth / 2 - 180, window.innerHeight / 3);
    }
  });

  // Gated on hostname only, not pathname: YouTube is an SPA, so a visitor can arrive at a /watch
  // page long after this script's one-time injection without a reload. subtitleBar itself watches
  // for that transition and every other navigation on every tick.
  if (location.hostname === "www.youtube.com") {
    initYoutubeSubtitles((word, x, y) => {
      // onWordClick only ever receives non-empty clickable text, so classifySelection should never
      // actually return "rejected" here — but that's an invariant of a third-party segmenter, not
      // a guarantee. Check it directly: if it ever did, run() would return before showing a card,
      // and pausing first would leave the video stuck paused with nothing left to trigger a resume.
      if (classifySelection(word).kind !== "rejected") pauseVideoForCaptionLookup();
      void run(word, x, y);
    });
  }
}
