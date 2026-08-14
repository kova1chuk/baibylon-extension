import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getToken } from "./api";
import { getPendingDeviceAuth, resumeSignIn, signIn } from "./deviceAuth";

function createFakeChrome() {
  const store: Record<string, unknown> = {};
  return {
    storage: {
      local: {
        get: (key: string) => Promise.resolve(key in store ? { [key]: store[key] } : {}),
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
    tabs: {
      create: vi.fn().mockResolvedValue(undefined),
    },
  } as unknown as typeof chrome;
}

function jsonResponse(status: number, body: unknown): Response {
  return {
    status,
    ok: status >= 200 && status < 300,
    json: () => Promise.resolve(body),
  } as Response;
}

const START = {
  deviceCode: "dc-1",
  userCode: "ABCD",
  verificationUrl: "https://vocairo.app/device",
  expiresInSec: 600,
  intervalSec: 2,
};

describe("signIn", () => {
  beforeEach(() => {
    globalThis.chrome = createFakeChrome();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
    Reflect.deleteProperty(globalThis, "chrome");
  });

  it("opens the verification tab, reports the user code, and stores the token once approved", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse(200, START))
      .mockResolvedValueOnce(jsonResponse(200, { status: "pending" }))
      .mockResolvedValueOnce(jsonResponse(200, { status: "approved", accessToken: "tok-1" }));
    vi.stubGlobal("fetch", fetchMock);

    const onCode = vi.fn();
    const promise = signIn(onCode);
    await vi.advanceTimersByTimeAsync(10_000);
    await promise;

    expect(onCode).toHaveBeenCalledWith("ABCD");
    expect(chrome.tabs.create).toHaveBeenCalledWith({ url: START.verificationUrl });
    await expect(getToken()).resolves.toBe("tok-1");
    await expect(getPendingDeviceAuth()).resolves.toBeNull();
  });

  it("keeps polling through a transient network error instead of failing", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse(200, START))
      .mockRejectedValueOnce(new TypeError("offline"))
      .mockResolvedValueOnce(jsonResponse(200, { status: "approved", accessToken: "tok-2" }));
    vi.stubGlobal("fetch", fetchMock);

    const promise = signIn(() => {});
    await vi.advanceTimersByTimeAsync(10_000);
    await promise;

    await expect(getToken()).resolves.toBe("tok-2");
  });

  it("surfaces a non-network error from the redeem call and clears the pending flow", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse(200, START))
      .mockResolvedValueOnce(jsonResponse(500, { message: "boom" }));
    vi.stubGlobal("fetch", fetchMock);

    const promise = signIn(() => {});
    const assertion = expect(promise).rejects.toMatchObject({ kind: "http", status: 500 });
    await vi.advanceTimersByTimeAsync(10_000);
    await assertion;

    await expect(getPendingDeviceAuth()).resolves.toBeNull();
  });

  it("rejects with denied when the user declines", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse(200, START))
      .mockResolvedValueOnce(jsonResponse(200, { status: "denied" }));
    vi.stubGlobal("fetch", fetchMock);

    const promise = signIn(() => {});
    const assertion = expect(promise).rejects.toThrow("denied");
    await vi.advanceTimersByTimeAsync(10_000);
    await assertion;
  });

  it("rejects with expired once the deadline passes without a decision", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse(200, { ...START, expiresInSec: 3, intervalSec: 2 }))
      .mockResolvedValue(jsonResponse(200, { status: "pending" }));
    vi.stubGlobal("fetch", fetchMock);

    const promise = signIn(() => {});
    const assertion = expect(promise).rejects.toThrow("expired");
    await vi.advanceTimersByTimeAsync(10_000);
    await assertion;

    await expect(getPendingDeviceAuth()).resolves.toBeNull();
  });
});

describe("getPendingDeviceAuth", () => {
  beforeEach(() => {
    globalThis.chrome = createFakeChrome();
  });

  afterEach(() => {
    Reflect.deleteProperty(globalThis, "chrome");
  });

  it("returns null when nothing is stored", async () => {
    await expect(getPendingDeviceAuth()).resolves.toBeNull();
  });

  it("returns null once the stored deadline is in the past", async () => {
    await chrome.storage.local.set({
      vocairoPendingDeviceAuth: {
        deviceCode: "dc-1",
        userCode: "ABCD",
        intervalSec: 2,
        deadline: Date.now() - 1,
      },
    });

    await expect(getPendingDeviceAuth()).resolves.toBeNull();
  });

  it("returns the stored flow while it is still within its deadline", async () => {
    const pending = {
      deviceCode: "dc-1",
      userCode: "ABCD",
      intervalSec: 2,
      deadline: Date.now() + 60_000,
    };
    await chrome.storage.local.set({ vocairoPendingDeviceAuth: pending });

    await expect(getPendingDeviceAuth()).resolves.toEqual(pending);
  });
});

describe("resumeSignIn", () => {
  beforeEach(() => {
    globalThis.chrome = createFakeChrome();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
    Reflect.deleteProperty(globalThis, "chrome");
  });

  it("checks the redeem endpoint immediately, without waiting out an interval first", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse(200, { status: "approved", accessToken: "tok-3" }));
    vi.stubGlobal("fetch", fetchMock);

    const pending = {
      deviceCode: "dc-1",
      userCode: "ABCD",
      intervalSec: 5,
      deadline: Date.now() + 60_000,
    };
    await resumeSignIn(pending);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    await expect(getToken()).resolves.toBe("tok-3");
  });

  it("does not open a new tab or restart the flow", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse(200, { status: "approved", accessToken: "tok-4" }));
    vi.stubGlobal("fetch", fetchMock);

    const pending = {
      deviceCode: "dc-1",
      userCode: "ABCD",
      intervalSec: 5,
      deadline: Date.now() + 60_000,
    };
    await resumeSignIn(pending);

    expect(chrome.tabs.create).not.toHaveBeenCalled();
  });
});
