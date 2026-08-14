import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  ApiError,
  classifySelection,
  getToken,
  lookup,
  setToken,
  startDeviceAuth,
  unwrap,
} from "./api";

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
  } as unknown as typeof chrome;
}

function jsonResponse(status: number, body: unknown): Response {
  return {
    status,
    ok: status >= 200 && status < 300,
    json: () => Promise.resolve(body),
  } as Response;
}

describe("unwrap", () => {
  it("returns the data field of a wrapped payload", () => {
    expect(unwrap<{ a: number }>({ success: true, data: { a: 1 } })).toEqual({ a: 1 });
  });

  it("returns an unwrapped payload untouched", () => {
    expect(unwrap<{ userCode: string }>({ userCode: "J23K" })).toEqual({ userCode: "J23K" });
  });

  it("does not mistake a payload that merely has a data field", () => {
    expect(unwrap<{ data: string }>({ data: "plain" })).toEqual({ data: "plain" });
  });
});

describe("classifySelection", () => {
  it("treats a single token as a word", () => {
    expect(classifySelection("  sea \n")).toEqual({ kind: "word", text: "sea" });
  });

  it("treats several tokens as a passage and collapses whitespace", () => {
    expect(classifySelection("the  sea\nis calm")).toEqual({
      kind: "passage",
      text: "the sea is calm",
    });
  });

  it("rejects empty selections", () => {
    expect(classifySelection("   ")).toEqual({ kind: "rejected" });
    expect(classifySelection("")).toEqual({ kind: "rejected" });
  });

  it("treats a spaceless Japanese sentence as a passage, not a word", () => {
    expect(classifySelection("今日はいい天気ですね")).toEqual({
      kind: "passage",
      text: "今日はいい天気ですね",
    });
  });

  it("treats a pure emoji run as a passage rather than rejecting it", () => {
    expect(classifySelection("🎉🎊✨")).toEqual({ kind: "passage", text: "🎉🎊✨" });
  });

  it("keeps a 120-character single token as a word", () => {
    const text = "a".repeat(120);
    expect(classifySelection(text)).toEqual({ kind: "word", text });
  });

  it("turns a 121-character single token into a passage instead of rejecting it", () => {
    const text = "a".repeat(121);
    expect(classifySelection(text)).toEqual({ kind: "passage", text });
  });

  it("truncates an overlong multi-word passage instead of rejecting it", () => {
    const result = classifySelection("word ".repeat(6000));
    expect(result).toEqual({ kind: "passage", text: "word ".repeat(6000).trim().slice(0, 20_000) });
    expect(result.kind === "passage" && result.text.length).toBe(20_000);
  });

  it("truncates an overlong passage to a whole number of UTF-16 units without splitting a surrogate pair", () => {
    const text = `a${"𝌆".repeat(15_000)}`;
    const result = classifySelection(text);
    expect(result.kind).toBe("passage");
    expect(result.kind === "passage" && result.text.length).toBe(19_999);
    expect(result.kind === "passage" && result.text).toBe(text.slice(0, 19_999));
  });

  // "world." segments into two total segments ("world", ".") but only one is word-like;
  // counting all segments instead of filtering by isWordLike misclassifies this as a passage.
  it("treats a word with trailing punctuation as a word, keeping the punctuation attached", () => {
    expect(classifySelection("world.")).toEqual({ kind: "word", text: "world." });
  });

  it("treats a word with trailing exclamation as a word, keeping the punctuation attached", () => {
    expect(classifySelection("hello!")).toEqual({ kind: "word", text: "hello!" });
  });
});

describe("post (via lookup/startDeviceAuth)", () => {
  beforeEach(() => {
    globalThis.chrome = createFakeChrome();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("throws notSignedIn and issues no fetch when no token is stored", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    await expect(lookup("world")).rejects.toMatchObject({
      kind: "notSignedIn",
    } satisfies Partial<ApiError>);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("clears the stored token and throws unauthorized carrying the server message on a 401 from an authenticated call", async () => {
    await setToken("abc123");
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(jsonResponse(401, { message: "token expired" })),
    );

    await expect(lookup("world")).rejects.toMatchObject({
      kind: "unauthorized",
      status: 401,
      message: "token expired",
    } satisfies Partial<ApiError>);
    await expect(getToken()).resolves.toBeNull();
  });

  it("leaves the stored token untouched on a 401 from an unauthenticated call", async () => {
    await setToken("abc123");
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse(401, { message: "nope" })));

    await expect(startDeviceAuth()).rejects.toMatchObject({
      kind: "unauthorized",
    } satisfies Partial<ApiError>);
    await expect(getToken()).resolves.toBe("abc123");
  });

  it("throws http with the status and message on a non-2xx, non-401 response", async () => {
    await setToken("abc123");
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse(500, { message: "boom" })));

    await expect(lookup("world")).rejects.toMatchObject({
      kind: "http",
      status: 500,
      message: "boom",
    } satisfies Partial<ApiError>);
  });

  it("throws network when the request transport fails", async () => {
    await setToken("abc123");
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("offline")));

    await expect(lookup("world")).rejects.toMatchObject({
      kind: "network",
    } satisfies Partial<ApiError>);
  });
});
