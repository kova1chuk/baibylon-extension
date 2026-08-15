import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { errorText } from "../content/card";
import { ApiError, type ApiErrorKind } from "./api";
import { WORKER_REQUEST_TIMEOUT_MS, accountLearningLanguage, lookup, passage } from "./apiBridge";
import { serializeError } from "./messages";

const KINDS: ApiErrorKind[] = ["network", "notSignedIn", "unauthorized", "http"];

let sendMessage: ReturnType<typeof vi.fn>;

beforeEach(() => {
  sendMessage = vi.fn();
  globalThis.chrome = { runtime: { sendMessage } } as unknown as typeof chrome;
});

afterEach(() => {
  vi.useRealTimers();
  Reflect.deleteProperty(globalThis, "chrome");
});

function workerFails(error: unknown) {
  sendMessage.mockResolvedValue({ ok: false, error: serializeError(error) });
}

describe("request shape", () => {
  it("asks the worker for a lookup instead of fetching from the page", async () => {
    sendMessage.mockResolvedValue({ ok: true, data: { surface: "sea" } });

    await expect(lookup("sea")).resolves.toEqual({ surface: "sea" });
    expect(sendMessage).toHaveBeenCalledWith({
      type: "vocairo/api",
      request: { op: "lookup", surface: "sea" },
    });
  });

  it("asks the worker for a passage", async () => {
    sendMessage.mockResolvedValue({ ok: true, data: { applied: true, wordCount: 4 } });

    await expect(passage("the sea is calm")).resolves.toEqual({ applied: true, wordCount: 4 });
    expect(sendMessage).toHaveBeenCalledWith({
      type: "vocairo/api",
      request: { op: "passage", text: "the sea is calm" },
    });
  });

  it("passes a null learning language through untouched", async () => {
    sendMessage.mockResolvedValue({ ok: true, data: null });

    await expect(accountLearningLanguage()).resolves.toBeNull();
    expect(sendMessage).toHaveBeenCalledWith({
      type: "vocairo/api",
      request: { op: "accountLearningLanguage" },
    });
  });
});

describe("error reconstruction", () => {
  it.each(KINDS)("rebuilds an ApiError of kind %s on the content side", async (kind) => {
    workerFails(new ApiError(kind, 401, "server said so"));

    await expect(lookup("sea")).rejects.toBeInstanceOf(ApiError);
    await expect(lookup("sea")).rejects.toMatchObject({
      kind,
      status: 401,
      message: "server said so",
    });
  });

  it("keeps the card's per-kind copy distinct after the round trip", async () => {
    const copy = await Promise.all(
      KINDS.map(async (kind) => {
        workerFails(new ApiError(kind));
        return lookup("sea").catch(errorText);
      }),
    );

    expect(new Set(copy).size).toBe(KINDS.length);
    expect(copy).toContain("Немає зʼєднання з сервером.");
    expect(copy).toContain("Увійдіть у Vocairo через значок розширення.");
  });

  it("renders the generic message for a worker failure that was never an ApiError", async () => {
    workerFails(new TypeError("worker blew up"));

    const message = await lookup("sea").catch(errorText);
    expect(message).toBe("Не вдалося отримати відповідь.");
  });

  it("reports network when the worker is unreachable", async () => {
    sendMessage.mockRejectedValue(
      new Error("Could not establish connection. Receiving end does not exist."),
    );

    await expect(lookup("sea")).rejects.toMatchObject({ kind: "network" });
  });

  it("reports network when the extension context is gone", async () => {
    sendMessage.mockImplementation(() => {
      throw new Error("Extension context invalidated.");
    });

    await expect(lookup("sea")).rejects.toMatchObject({ kind: "network" });
  });

  it("reports network when no listener answered", async () => {
    sendMessage.mockResolvedValue(undefined);

    await expect(lookup("sea")).rejects.toMatchObject({ kind: "network" });
  });

  it("reports network when the worker answers with something unrecognisable", async () => {
    sendMessage.mockResolvedValue({ nonsense: true });

    await expect(lookup("sea")).rejects.toMatchObject({ kind: "network" });
  });
});

describe("timeout", () => {
  it("fails with a network error instead of hanging when the worker never responds", async () => {
    vi.useFakeTimers();
    sendMessage.mockReturnValue(new Promise(() => {}));

    const pending = lookup("sea");
    const assertion = expect(pending).rejects.toMatchObject({ kind: "network" });
    await vi.advanceTimersByTimeAsync(WORKER_REQUEST_TIMEOUT_MS);

    await assertion;
    await expect(pending.catch(errorText)).resolves.toBe("Немає зʼєднання з сервером.");
  });

  it("still resolves a slow worker that answers before the timeout", async () => {
    vi.useFakeTimers();
    sendMessage.mockReturnValue(
      new Promise((resolve) =>
        setTimeout(
          () => resolve({ ok: true, data: { surface: "sea" } }),
          WORKER_REQUEST_TIMEOUT_MS - 1,
        ),
      ),
    );

    const pending = lookup("sea");
    await vi.advanceTimersByTimeAsync(WORKER_REQUEST_TIMEOUT_MS);

    await expect(pending).resolves.toEqual({ surface: "sea" });
  });
});
