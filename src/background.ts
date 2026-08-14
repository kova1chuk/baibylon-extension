const MENU_ID = "vocairo-lookup";

chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: MENU_ID,
    title: "Vocairo: подивитися",
    contexts: ["selection"],
    documentUrlPatterns: ["<all_urls>"],
  });
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId !== MENU_ID || !info.selectionText || !tab?.id) return;
  chrome.tabs.sendMessage(tab.id, { action: "vocairoShow", text: info.selectionText });
});
