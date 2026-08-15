import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { setToken } from "./lib/api";

function createFakeChrome(
  overrides: {
    sendMessage?: ReturnType<typeof vi.fn>;
    executeScript?: ReturnType<typeof vi.fn>;
    onMessage?: ReturnType<typeof vi.fn>;
    storageGet?: (key: string) => Promise<Record<string, unknown>>;
  } = {},
) {
  const store: Record<string, unknown> = {};
  return {
    runtime: {
      onInstalled: { addListener: vi.fn() },
      onMessage: { addListener: overrides.onMessage ?? vi.fn() },
    },
    contextMenus: { create: vi.fn(), onClicked: { addListener: vi.fn() } },
    tabs: { sendMessage: overrides.sendMessage ?? vi.fn() },
    scripting: { executeScript: overrides.executeScript ?? vi.fn() },
    storage: {
      local: {
        get:
          overrides.storageGet ??
          ((key: string) => Promise.resolve(key in store ? { [key]: store[key] } : {})),
        set: (items: Record<string, unknown>) => {
          Object.assign(store, items);
          return Promise.resolve();
        },
        remove: (key: string) => {
          delete store[key];
          return Promise.resolve();
        },
      },
    },
  } as unknown as typeof chrome;
}

type ApiMessageListener = (
  message: unknown,
  sender: unknown,
  sendResponse: (response: unknown) => void,
) => boolean;

async function loadListener(
  options: { storageGet?: (key: string) => Promise<Record<string, unknown>> } = {},
): Promise<ApiMessageListener> {
  const onMessage = vi.fn();
  globalThis.chrome = createFakeChrome({ onMessage, ...options });
  await import("./background");
  return onMessage.mock.calls[0]![0] as ApiMessageListener;
}

function dispatch(listener: ApiMessageListener, message: unknown) {
  let settle!: (value: unknown) => void;
  const response = new Promise<unknown>((resolve) => {
    settle = resolve;
  });
  const keptChannelOpen = listener(message, {}, settle);
  return { keptChannelOpen, response };
}

function apiMessage(request: unknown) {
  return { type: "vocairo/api", request };
}

function jsonResponse(status: number, body: unknown): Response {
  return {
    status,
    ok: status >= 200 && status < 300,
    json: () => Promise.resolve(body),
  } as Response;
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

describe("api message listener", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    Reflect.deleteProperty(globalThis, "chrome");
  });

  it("ignores a message that is not an api request without holding the channel open", async () => {
    const listener = await loadListener();

    expect(dispatch(listener, { action: "vocairoShow", text: "hello" }).keptChannelOpen).toBe(
      false,
    );
    expect(dispatch(listener, apiMessage({ op: "dropTables" })).keptChannelOpen).toBe(false);
    expect(dispatch(listener, undefined).keptChannelOpen).toBe(false);
  });

  it("answers a lookup with the unwrapped payload", async () => {
    const listener = await loadListener();
    await setToken("token");
    const result = { surface: "sea", translation: "море" };
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(jsonResponse(200, { success: true, data: result })),
    );

    const { keptChannelOpen, response } = dispatch(
      listener,
      apiMessage({ op: "lookup", surface: "sea" }),
    );

    expect(keptChannelOpen).toBe(true);
    await expect(response).resolves.toEqual({ ok: true, data: result });
  });

  it("fetches through the worker rather than the calling page", async () => {
    const listener = await loadListener();
    await setToken("token");
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(200, { success: true, data: null }));
    vi.stubGlobal("fetch", fetchMock);

    await dispatch(listener, apiMessage({ op: "accountLearningLanguage" })).response;

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0]![0]).toContain("/account/profile");
  });

  it("serialises notSignedIn when no token is stored", async () => {
    const listener = await loadListener();
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    await expect(
      dispatch(listener, apiMessage({ op: "lookup", surface: "sea" })).response,
    ).resolves.toEqual({ ok: false, error: { kind: "notSignedIn", message: "notSignedIn" } });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("serialises unauthorized with its status and server message", async () => {
    const listener = await loadListener();
    await setToken("stale");
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(jsonResponse(401, { message: "token expired" })),
    );

    await expect(
      dispatch(listener, apiMessage({ op: "passage", text: "the sea is calm" })).response,
    ).resolves.toEqual({
      ok: false,
      error: { kind: "unauthorized", status: 401, message: "token expired" },
    });
  });

  it("serialises http with its status and server message", async () => {
    const listener = await loadListener();
    await setToken("token");
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse(500, { message: "boom" })));

    await expect(
      dispatch(listener, apiMessage({ op: "lookup", surface: "sea" })).response,
    ).resolves.toEqual({ ok: false, error: { kind: "http", status: 500, message: "boom" } });
  });

  it("serialises network when the worker's own fetch fails", async () => {
    const listener = await loadListener();
    await setToken("token");
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("Failed to fetch")));

    await expect(
      dispatch(listener, apiMessage({ op: "lookup", surface: "sea" })).response,
    ).resolves.toEqual({ ok: false, error: { kind: "network", message: "network" } });
  });

  it("serialises a failure that was never an ApiError as unknown rather than inventing a kind", async () => {
    const listener = await loadListener({
      storageGet: () => Promise.reject(new Error("storage unavailable")),
    });
    vi.stubGlobal("fetch", vi.fn());

    await expect(
      dispatch(listener, apiMessage({ op: "lookup", surface: "sea" })).response,
    ).resolves.toEqual({ ok: false, error: { kind: "unknown", message: "storage unavailable" } });
  });

  it("reads the token per request, so a restarted worker still authenticates", async () => {
    const listener = await loadListener();
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(200, { success: true, data: null }));
    vi.stubGlobal("fetch", fetchMock);

    await expect(
      dispatch(listener, apiMessage({ op: "lookup", surface: "sea" })).response,
    ).resolves.toMatchObject({ ok: false, error: { kind: "notSignedIn" } });

    await setToken("signed-in-later");
    await dispatch(listener, apiMessage({ op: "lookup", surface: "sea" })).response;

    expect(fetchMock.mock.calls[0]![1]).toMatchObject({
      headers: { Authorization: "Bearer signed-in-later" },
    });
  });
});
