import { describe, expect, it } from "vitest";
import { classifySelection, unwrap } from "./api";

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
});
