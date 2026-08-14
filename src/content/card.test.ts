import { describe, expect, it } from "vitest";
import { ApiError } from "../lib/api";
import type { LookupResult, PassageResult } from "../lib/types";
import { errorText, escapeHtml, renderLookup, renderPassage } from "./card";

describe("escapeHtml", () => {
  it("escapes all five HTML-sensitive characters", () => {
    expect(escapeHtml(`<script>alert("x")&'y'</script>`)).toBe(
      "&lt;script&gt;alert(&quot;x&quot;)&amp;&#39;y&#39;&lt;/script&gt;",
    );
  });

  it("leaves ordinary text untouched", () => {
    expect(escapeHtml("привіт world 123")).toBe("привіт world 123");
  });
});

function baseLookup(overrides: Partial<LookupResult> = {}): LookupResult {
  return {
    surface: "sea",
    translation: "море",
    definition: null,
    translations: ["море"],
    senses: [],
    synonyms: [],
    ...overrides,
  };
}

describe("renderLookup", () => {
  it("renders the surface and primary translation", () => {
    const html = renderLookup(baseLookup());
    expect(html).toContain('<div class="title">sea</div>');
    expect(html).toContain("<div>море</div>");
  });

  it("shows the server-echoed surface, not any other text, as the title", () => {
    const html = renderLookup(baseLookup({ surface: "world" }));
    expect(html).toContain('<div class="title">world</div>');
  });

  it("includes the phonetic next to the title only when present", () => {
    const withPhonetic = renderLookup(baseLookup({ phonetic: "siː" }));
    expect(withPhonetic).toContain('<span class="muted">siː</span>');
    const withoutPhonetic = renderLookup(baseLookup());
    expect(withoutPhonetic).not.toContain("muted");
  });

  it("lists extra translations distinct from the primary one, and omits the line otherwise", () => {
    const withExtra = renderLookup(
      baseLookup({ translation: "море", translations: ["море", "океан"] }),
    );
    expect(withExtra).toContain("океан");
    const withoutExtra = renderLookup(baseLookup({ translation: "море", translations: ["море"] }));
    expect(withoutExtra.match(/muted/g)).toBeNull();
  });

  it("renders at most three senses, numbered", () => {
    const html = renderLookup(
      baseLookup({
        senses: [
          { definition: "a body of salt water" },
          { definition: "a large quantity" },
          { definition: "third sense" },
          { definition: "fourth sense, dropped" },
        ],
      }),
    );
    expect(html).toContain("1. a body of salt water");
    expect(html).toContain("3. third sense");
    expect(html).not.toContain("fourth sense");
  });

  it("renders synonyms only when present", () => {
    expect(renderLookup(baseLookup({ synonyms: ["ocean"] }))).toContain("Синоніми: ocean");
    expect(renderLookup(baseLookup())).not.toContain("Синоніми");
  });

  it("escapes markup in every server-provided field, defeating a stored-XSS attempt", () => {
    const html = renderLookup(
      baseLookup({
        surface: "<img src=x onerror=alert(1)>",
        translation: "<b>bold</b>",
        translations: ["<b>bold</b>"],
        phonetic: '"><script>',
        senses: [{ definition: "<script>alert(2)</script>" }],
        synonyms: ["<i>x</i>"],
      }),
    );
    expect(html).not.toContain("<img");
    expect(html).not.toContain("<script>");
    expect(html).not.toContain("<b>");
    expect(html).not.toContain("<i>");
    expect(html).toContain("&lt;img src=x onerror=alert(1)&gt;");
  });
});

function basePassage(overrides: Partial<PassageResult> = {}): PassageResult {
  return {
    applied: true,
    wordCount: 12,
    text: "the sea is calm tonight",
    translation: "море спокійне сьогодні ввечері",
    ...overrides,
  };
}

describe("renderPassage", () => {
  it("shows the credited word count when newly applied", () => {
    expect(renderPassage(basePassage({ applied: true, wordCount: 12 }))).toContain(
      "зараховано слів: 12",
    );
  });

  it("shows the already-credited message when not newly applied", () => {
    expect(renderPassage(basePassage({ applied: false }))).toContain("цей фрагмент уже зараховано");
  });

  it("appends the truncation note only when truncated", () => {
    expect(renderPassage(basePassage({ truncated: true }))).toContain("показано початок фрагмента");
    expect(renderPassage(basePassage({ truncated: false }))).not.toContain("показано початок");
  });

  it("falls back to a placeholder when the server sends no translation", () => {
    expect(renderPassage(basePassage({ translation: null }))).toContain(
      "Переклад тимчасово недоступний",
    );
  });

  it("truncates the displayed source text to 220 characters", () => {
    const text = "a".repeat(300);
    const html = renderPassage(basePassage({ text }));
    expect(html).toContain("a".repeat(220));
    expect(html).not.toContain("a".repeat(221));
  });

  it("escapes markup in the source text and translation", () => {
    const html = renderPassage(
      basePassage({
        text: "<script>alert(1)</script>",
        translation: "<img src=x onerror=alert(2)>",
      }),
    );
    expect(html).not.toContain("<script>");
    expect(html).not.toContain("<img");
  });
});

describe("errorText", () => {
  it("tells the user to sign in when they never did", () => {
    expect(errorText(new ApiError("notSignedIn"))).toBe(
      "Увійдіть у Vocairo через значок розширення.",
    );
  });

  it("tells the user their session ended when the token was rejected and cleared", () => {
    expect(errorText(new ApiError("unauthorized", 401, "token expired"))).toBe(
      "Сесія завершилася. Увійдіть знову через значок розширення.",
    );
  });

  it("reports a connectivity problem for a network error", () => {
    expect(errorText(new ApiError("network"))).toBe("Немає зʼєднання з сервером.");
  });

  it("surfaces the server's message for a generic http error", () => {
    expect(errorText(new ApiError("http", 500, "boom"))).toBe("boom");
  });

  it("falls back to a generic message when an http error carries no message", () => {
    expect(errorText(new ApiError("http", 500, ""))).toBe("Помилка сервера.");
  });

  it("falls back to a generic message for a non-ApiError value", () => {
    expect(errorText(new Error("some unrelated failure"))).toBe("Не вдалося отримати відповідь.");
    expect(errorText("plain string")).toBe("Не вдалося отримати відповідь.");
  });

  it("still gets escaped downstream when the server message contains markup", () => {
    const message = escapeHtml(errorText(new ApiError("http", 500, "<script>alert(1)</script>")));
    expect(message).toBe("&lt;script&gt;alert(1)&lt;/script&gt;");
  });
});
