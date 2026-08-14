import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

function createFakeChrome(overrides: {
  sendMessage: ReturnType<typeof vi.fn>;
  executeScript: ReturnType<typeof vi.fn>;
}) {
  return {
    runtime: { onInstalled: { addListener: vi.fn() } },
    contextMenus: { create: vi.fn(), onClicked: { addListener: vi.fn() } },
    tabs: { sendMessage: overrides.sendMessage },
    scripting: { executeScript: overrides.executeScript },
  } as unknown as typeof chrome;
}

describe("showSelectionInTab", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    Reflect.deleteProperty(globalThis, "chrome");
  });

  it("sends directly and never injects when a content script already answers", async () => {
    const sendMessage = vi.fn().mockResolvedValue(undefined);
    const executeScript = vi.fn();
    globalThis.chrome = createFakeChrome({ sendMessage, executeScript });

    const { showSelectionInTab } = await import("./background");
    await showSelectionInTab(7, "hello");

    expect(sendMessage).toHaveBeenCalledTimes(1);
    expect(sendMessage).toHaveBeenCalledWith(7, { action: "vocairoShow", text: "hello" });
    expect(executeScript).not.toHaveBeenCalled();
  });

  it("injects the content script and retries once when the first send finds no listener", async () => {
    const sendMessage = vi
      .fn()
      .mockRejectedValueOnce(
        new Error("Could not establish connection. Receiving end does not exist."),
      )
      .mockResolvedValueOnce(undefined);
    const executeScript = vi.fn().mockResolvedValue(undefined);
    globalThis.chrome = createFakeChrome({ sendMessage, executeScript });

    const { showSelectionInTab } = await import("./background");
    await showSelectionInTab(7, "hello");

    expect(executeScript).toHaveBeenCalledWith({ target: { tabId: 7 }, files: ["content.js"] });
    expect(sendMessage).toHaveBeenCalledTimes(2);
  });

  it("resolves instead of leaving a rejected promise when injection also fails", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const sendMessage = vi.fn().mockRejectedValue(new Error("no receiver"));
    const executeScript = vi.fn().mockRejectedValue(new Error("Cannot access a chrome:// URL"));
    globalThis.chrome = createFakeChrome({ sendMessage, executeScript });

    const { showSelectionInTab } = await import("./background");

    await expect(showSelectionInTab(7, "hello")).resolves.toBeUndefined();
  });
});
