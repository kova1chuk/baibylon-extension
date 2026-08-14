import { classifySelection, lookup, passage } from "./lib/api";
import { errorText, escapeHtml, mountCard, renderLookup, renderPassage } from "./content/card";

const card = mountCard();
let button: HTMLButtonElement | null = null;

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

document.addEventListener("mouseup", (event) => {
  // The browser hasn't always committed the new selection by the time mouseup fires;
  // reading it synchronously here can still return the previous selection.
  window.setTimeout(() => {
    const raw = window.getSelection()?.toString() ?? "";
    if (classifySelection(raw).kind === "rejected") {
      removeButton();
      return;
    }
    removeButton();
    const trigger = document.createElement("button");
    trigger.textContent = "V";
    trigger.style.cssText = [
      "position:fixed",
      `left:${event.clientX + 6}px`,
      `top:${event.clientY + 6}px`,
      "z-index:2147483647",
      "width:24px;height:24px;border-radius:12px;border:0",
      "background:#4338ca;color:#fff;font:600 12px system-ui;cursor:pointer",
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
  if (event.target !== button) card.hide();
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    card.hide();
    removeButton();
  }
});

chrome.runtime.onMessage.addListener((message) => {
  if (message?.action === "vocairoShow" && typeof message.text === "string") {
    void run(message.text, window.innerWidth / 2 - 180, window.innerHeight / 3);
  }
});
