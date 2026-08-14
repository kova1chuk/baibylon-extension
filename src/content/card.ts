import { ApiError } from "../lib/api";
import type { LookupResult, PassageResult } from "../lib/types";

const STYLE = `
:host { all: initial; }
.card {
  position: fixed; z-index: 2147483647; max-width: 360px;
  padding: 12px 14px; border-radius: 10px;
  background: #ffffff; color: #111111;
  box-shadow: 0 8px 28px rgba(0,0,0,.18);
  font: 13px/1.45 -apple-system, system-ui, sans-serif;
}
@media (prefers-color-scheme: dark) {
  .card { background: #1c1c1e; color: #f2f2f7; box-shadow: 0 8px 28px rgba(0,0,0,.5); }
}
.title { font-weight: 600; margin-bottom: 4px; }
.muted { opacity: .65; }
.sense { margin-top: 6px; }
.hidden { display: none; }
`;

export function escapeHtml(value: string): string {
  return value.replace(
    /[&<>"']/g,
    (char) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char] as string,
  );
}

export function renderLookup(result: LookupResult): string {
  const parts = [
    `<div class="title">${escapeHtml(result.surface)}${
      result.phonetic ? ` <span class="muted">${escapeHtml(result.phonetic)}</span>` : ""
    }</div>`,
    `<div>${escapeHtml(result.translation)}</div>`,
  ];
  const extra = result.translations.filter((item) => item !== result.translation);
  if (extra.length) {
    parts.push(`<div class="muted">${escapeHtml(extra.join(", "))}</div>`);
  }
  for (const [index, sense] of result.senses.slice(0, 3).entries()) {
    parts.push(`<div class="sense">${index + 1}. ${escapeHtml(sense.definition)}</div>`);
  }
  if (result.synonyms.length) {
    parts.push(
      `<div class="muted sense">Синоніми: ${escapeHtml(result.synonyms.join(", "))}</div>`,
    );
  }
  return parts.join("");
}

export function renderPassage(result: PassageResult): string {
  const credited = result.applied
    ? `зараховано слів: ${result.wordCount}`
    : "цей фрагмент уже зараховано";
  const suffix = result.truncated ? " · показано початок фрагмента" : "";
  return [
    `<div class="muted">${escapeHtml(result.text.slice(0, 220))}</div>`,
    `<div class="sense">${
      result.translation
        ? escapeHtml(result.translation)
        : '<span class="muted">Переклад тимчасово недоступний</span>'
    }</div>`,
    `<div class="muted sense">${escapeHtml(credited + suffix)}</div>`,
  ].join("");
}

// Kept alongside the other render helpers (not in content.ts) so it stays unit-testable without a DOM.
export function errorText(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.kind === "notSignedIn") return "Увійдіть у Vocairo через значок розширення.";
    if (error.kind === "unauthorized") {
      return "Сесія завершилася. Увійдіть знову через значок розширення.";
    }
    if (error.kind === "network") return "Немає зʼєднання з сервером.";
    return error.message || "Помилка сервера.";
  }
  return "Не вдалося отримати відповідь.";
}

export function mountCard() {
  const host = document.createElement("div");
  // A hostile page's `* { all: unset !important }` can still reach the host itself (it lives
  // in the page's light DOM); an inline !important is the only declaration that outranks it.
  host.style.setProperty("all", "initial", "important");
  const root = host.attachShadow({ mode: "closed" });
  const style = document.createElement("style");
  style.textContent = STYLE;
  const card = document.createElement("div");
  card.className = "card hidden";
  root.append(style, card);
  document.documentElement.append(host);

  return {
    show(html: string) {
      card.innerHTML = html;
      card.classList.remove("hidden");
    },
    hide() {
      card.classList.add("hidden");
    },
    positionAt(x: number, y: number) {
      const left = Math.min(x, window.innerWidth - 380);
      const top = Math.min(y + 12, window.innerHeight - 160);
      card.style.left = `${Math.max(8, left)}px`;
      card.style.top = `${Math.max(8, top)}px`;
    },
  };
}
