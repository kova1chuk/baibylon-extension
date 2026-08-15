import { accountLearningLanguage, lookup, passage } from "./lib/api";
import {
  type ApiRequest,
  type ApiResultMap,
  isApiRequestMessage,
  serializeError,
} from "./lib/messages";

const MENU_ID = "vocairo-lookup";

chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: MENU_ID,
    title: "Vocairo: подивитися",
    contexts: ["selection"],
    documentUrlPatterns: ["<all_urls>"],
  });
});

export async function showSelectionInTab(tabId: number, text: string): Promise<void> {
  try {
    await chrome.tabs.sendMessage(tabId, { action: "vocairoShow", text });
    return;
  } catch {
    // Tab predates the extension's install (or hasn't navigated since) — no content script
    // is listening yet. Inject it on demand and retry once before giving up.
  }
  try {
    await chrome.scripting.executeScript({ target: { tabId }, files: ["content.js"] });
    await chrome.tabs.sendMessage(tabId, { action: "vocairoShow", text });
  } catch (error) {
    console.error("Vocairo: could not show the card in this tab", error);
  }
}

chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId !== MENU_ID || !info.selectionText || !tab?.id) return;
  void showSelectionInTab(tab.id, info.selectionText);
});

export function runApiRequest(request: ApiRequest): Promise<ApiResultMap[ApiRequest["op"]]> {
  switch (request.op) {
    case "lookup":
      return lookup(request.surface);
    case "passage":
      return passage(request.text);
    case "accountLearningLanguage":
      return accountLearningLanguage();
  }
}

// Content scripts route every call here because a page's connect-src CSP governs their fetches (YouTube blocks ours) but not the worker's.
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (!isApiRequestMessage(message)) return false;
  runApiRequest(message.request).then(
    (data) => sendResponse({ ok: true, data }),
    (error: unknown) => sendResponse({ ok: false, error: serializeError(error) }),
  );
  return true;
});
