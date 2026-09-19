import { describe, expect, it } from "vitest";
import { ApiError, type ApiErrorKind } from "../api";
import { deserializeError, isApiRequestMessage, serializeError } from "../messages";

const KINDS: ApiErrorKind[] = ["network", "notSignedIn", "unauthorized", "http"];

describe("isApiRequestMessage", () => {
  it("accepts every supported operation", () => {
    expect(isApiRequestMessage({ type: "vocairo/api", request: { op: "lookup" } })).toBe(true);
    expect(isApiRequestMessage({ type: "vocairo/api", request: { op: "passage" } })).toBe(true);
    expect(
      isApiRequestMessage({ type: "vocairo/api", request: { op: "accountLearningLanguage" } }),
    ).toBe(true);
  });

  it("rejects anything else the worker may receive", () => {
    expect(isApiRequestMessage({ action: "vocairoShow", text: "hello" })).toBe(false);
    expect(isApiRequestMessage({ type: "vocairo/api", request: { op: "unknownOp" } })).toBe(false);
    expect(isApiRequestMessage({ type: "vocairo/api" })).toBe(false);
    expect(isApiRequestMessage(null)).toBe(false);
    expect(isApiRequestMessage(undefined)).toBe(false);
    expect(isApiRequestMessage("vocairo/api")).toBe(false);
  });
});

describe("serializeError / deserializeError", () => {
  it.each(KINDS)("round-trips the %s kind", (kind) => {
    const restored = deserializeError(serializeError(new ApiError(kind)));

    expect(restored).toBeInstanceOf(ApiError);
    expect(restored).toMatchObject({ kind, message: kind });
  });

  it("keeps the status and server message alongside the kind", () => {
    const restored = deserializeError(serializeError(new ApiError("http", 503, "upstream down")));

    expect(restored).toMatchObject({ kind: "http", status: 503, message: "upstream down" });
  });

  it("survives the JSON round trip chrome message passing performs", () => {
    const wire = JSON.parse(
      JSON.stringify(serializeError(new ApiError("unauthorized", 401, "token expired"))),
    );

    expect(deserializeError(wire)).toMatchObject({
      kind: "unauthorized",
      status: 401,
      message: "token expired",
    });
  });

  it("marks a non-ApiError failure unknown so it is not restored as an ApiError", () => {
    const restored = deserializeError(serializeError(new TypeError("worker blew up")));

    expect(restored).not.toBeInstanceOf(ApiError);
    expect(restored.message).toBe("worker blew up");
  });

  it("tolerates a thrown non-Error", () => {
    expect(serializeError("just a string")).toEqual({ kind: "unknown", message: undefined });
    expect(deserializeError(serializeError("just a string"))).not.toBeInstanceOf(ApiError);
  });
});
