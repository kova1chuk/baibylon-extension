import { describe, expect, it } from "vitest";
import {
  type TokenPatchOp,
  type WordToken,
  didCaptionDisplayChange,
  diffWordTokens,
  extractVideoId,
  joinCaptionSegments,
  parseCaptionTracklist,
  parseCaptionTracks,
  resolveCaptionDisplay,
  selectCaptionTrack,
  splitIntoWordTokens,
} from "./captions";

describe("extractVideoId", () => {
  it("reads the v param off a watch URL", () => {
    expect(extractVideoId("https://www.youtube.com/watch?v=abc123XYZ_-")).toBe("abc123XYZ_-");
  });

  it("reads the v param when other query params are present", () => {
    expect(extractVideoId("https://www.youtube.com/watch?t=30&v=abc123&list=xyz")).toBe("abc123");
  });

  it("returns null for a watch URL with no v param", () => {
    expect(extractVideoId("https://www.youtube.com/watch?list=xyz")).toBeNull();
  });

  it("returns null for a non-watch YouTube page", () => {
    expect(extractVideoId("https://www.youtube.com/")).toBeNull();
    expect(extractVideoId("https://www.youtube.com/results?search_query=cats")).toBeNull();
  });

  it("returns null for an unparsable URL", () => {
    expect(extractVideoId("not a url")).toBeNull();
  });

  it("reads the id out of a /shorts/ path", () => {
    expect(extractVideoId("https://www.youtube.com/shorts/abc123XYZ_-")).toBe("abc123XYZ_-");
  });
});

describe("parseCaptionTracks", () => {
  it("extracts language, label, and asr flag from a well-formed response", () => {
    const tracks = parseCaptionTracks({
      captions: {
        playerCaptionsTracklistRenderer: {
          captionTracks: [
            { languageCode: "en", name: { simpleText: "English" }, kind: "asr" },
            { languageCode: "uk", name: { simpleText: "Ukrainian" } },
          ],
        },
      },
    });

    expect(tracks).toEqual([
      { languageCode: "en", name: "English", isAsr: true },
      { languageCode: "uk", name: "Ukrainian", isAsr: false },
    ]);
  });

  it("falls back to the language code as the label when no simpleText name is present", () => {
    const tracks = parseCaptionTracks({
      captions: { playerCaptionsTracklistRenderer: { captionTracks: [{ languageCode: "fr" }] } },
    });
    expect(tracks[0]?.name).toBe("fr");
  });

  it("skips entries missing a languageCode instead of throwing", () => {
    const tracks = parseCaptionTracks({
      captions: {
        playerCaptionsTracklistRenderer: {
          captionTracks: [{ name: { simpleText: "x" } }, null, "garbage"],
        },
      },
    });
    expect(tracks).toEqual([]);
  });

  it("returns an empty array when the video has no captions object at all", () => {
    expect(parseCaptionTracks({})).toEqual([]);
    expect(parseCaptionTracks(null)).toEqual([]);
    expect(parseCaptionTracks(undefined)).toEqual([]);
  });

  it("returns an empty array when captionTracks is missing or not an array", () => {
    expect(parseCaptionTracks({ captions: { playerCaptionsTracklistRenderer: {} } })).toEqual([]);
    expect(
      parseCaptionTracks({
        captions: { playerCaptionsTracklistRenderer: { captionTracks: "nope" } },
      }),
    ).toEqual([]);
  });
});

describe("parseCaptionTracklist", () => {
  it("maps a manual track, treating its empty-string kind as not ASR", () => {
    const tracks = parseCaptionTracklist([
      {
        languageCode: "en",
        languageName: "English",
        displayName: "English",
        kind: "",
        name: "",
        id: null,
        vss_id: ".en",
        is_default: false,
        is_servable: false,
        is_translateable: true,
      },
    ]);
    expect(tracks).toEqual([{ languageCode: "en", name: "English", isAsr: false }]);
  });

  it('treats kind "asr" as an auto-generated track', () => {
    const tracks = parseCaptionTracklist([
      { languageCode: "en", languageName: "English", displayName: "English", kind: "asr" },
    ]);
    expect(tracks[0]?.isAsr).toBe(true);
  });

  it("falls back to languageName when displayName is missing", () => {
    const tracks = parseCaptionTracklist([
      { languageCode: "uk", languageName: "Ukrainian", displayName: "", kind: "" },
    ]);
    expect(tracks[0]?.name).toBe("Ukrainian");
  });

  it("falls back to languageCode when both displayName and languageName are missing", () => {
    const tracks = parseCaptionTracklist([{ languageCode: "fr", kind: "" }]);
    expect(tracks[0]?.name).toBe("fr");
  });

  it("prefers displayName over languageName when both are present", () => {
    const tracks = parseCaptionTracklist([
      { languageCode: "en", languageName: "English", displayName: "English (custom)", kind: "" },
    ]);
    expect(tracks[0]?.name).toBe("English (custom)");
  });

  it("skips entries missing a languageCode instead of throwing", () => {
    const tracks = parseCaptionTracklist([{ displayName: "x" }, null, "garbage"]);
    expect(tracks).toEqual([]);
  });

  it("returns an empty array when the tracklist is not an array", () => {
    expect(parseCaptionTracklist(undefined)).toEqual([]);
    expect(parseCaptionTracklist(null)).toEqual([]);
    expect(parseCaptionTracklist({})).toEqual([]);
  });
});

describe("selectCaptionTrack", () => {
  const humanEnglish = { languageCode: "en", name: "English", isAsr: false };
  const asrEnglish = { languageCode: "en", name: "English (auto)", isAsr: true };
  const humanUkrainian = { languageCode: "uk", name: "Ukrainian", isAsr: false };
  const asrUkrainian = { languageCode: "uk", name: "Ukrainian (auto)", isAsr: true };

  it("reports unavailable when there are no tracks", () => {
    expect(selectCaptionTrack([], "en")).toEqual({ status: "unavailable" });
  });

  it("matches and prefers a manual track over an auto-generated one in the target language", () => {
    expect(selectCaptionTrack([asrEnglish, humanEnglish], "en")).toEqual({
      status: "matched",
      track: humanEnglish,
    });
  });

  it("matches the auto-generated track when it's the only one in the target language", () => {
    expect(selectCaptionTrack([humanUkrainian, asrEnglish], "en")).toEqual({
      status: "matched",
      track: asrEnglish,
    });
  });

  it("matches a region variant of the target language (en-US matches en)", () => {
    const enUs = { languageCode: "en-US", name: "English (US)", isAsr: false };
    expect(selectCaptionTrack([enUs], "en")).toEqual({ status: "matched", track: enUs });
  });

  it("falls back to the best available track, preferring manual, when nothing matches", () => {
    expect(selectCaptionTrack([asrUkrainian, humanUkrainian], "en")).toEqual({
      status: "fallback",
      track: humanUkrainian,
    });
  });

  it("falls back to whatever track exists, even ASR-only, when nothing else is available", () => {
    expect(selectCaptionTrack([asrUkrainian], "en")).toEqual({
      status: "fallback",
      track: asrUkrainian,
    });
  });

  it("honors a custom target language", () => {
    expect(selectCaptionTrack([humanEnglish, humanUkrainian], "uk")).toEqual({
      status: "matched",
      track: humanUkrainian,
    });
  });
});

describe("joinCaptionSegments", () => {
  it("joins multiple segments with a single space", () => {
    expect(joinCaptionSegments(["hello", "world"])).toBe("hello world");
  });

  it("trims each segment before joining", () => {
    expect(joinCaptionSegments([" hello ", " world "])).toBe("hello world");
  });

  it("drops empty or whitespace-only segments", () => {
    expect(joinCaptionSegments(["hello", "  ", "", "world"])).toBe("hello world");
  });

  it("returns an empty string for no segments", () => {
    expect(joinCaptionSegments([])).toBe("");
  });

  it("passes a single segment through unchanged apart from trimming", () => {
    expect(joinCaptionSegments(["  a whole line already  "])).toBe("a whole line already");
  });
});

describe("resolveCaptionDisplay", () => {
  const matched = {
    status: "matched" as const,
    track: { languageCode: "en", name: "English", isAsr: false },
  };
  const fallback = {
    status: "fallback" as const,
    track: { languageCode: "uk", name: "Ukrainian", isAsr: false },
  };
  const unavailable = { status: "unavailable" as const };

  it("reports unavailable regardless of enableFailed, since no track exists at all", () => {
    expect(resolveCaptionDisplay(true, unavailable, "anything")).toEqual({ kind: "unavailable" });
    expect(resolveCaptionDisplay(false, unavailable, "")).toEqual({ kind: "unavailable" });
  });

  it("reports enableFailed once retries are exhausted, even with a matched track", () => {
    expect(resolveCaptionDisplay(true, matched, "hello")).toEqual({ kind: "enableFailed" });
  });

  it("reports empty when enabling hasn't failed but no line is currently showing", () => {
    expect(resolveCaptionDisplay(false, matched, "")).toEqual({ kind: "empty" });
    expect(resolveCaptionDisplay(false, matched, "   ")).toEqual({ kind: "empty" });
  });

  it("reports a plain line for a matched target-language track", () => {
    expect(resolveCaptionDisplay(false, matched, "hello world")).toEqual({
      kind: "line",
      text: "hello world",
    });
  });

  it("reports wrongLanguage with the shown track's name for a fallback track", () => {
    expect(resolveCaptionDisplay(false, fallback, "привіт")).toEqual({
      kind: "wrongLanguage",
      text: "привіт",
      shownLanguageName: "Ukrainian",
    });
  });
});

describe("didCaptionDisplayChange", () => {
  it("is true the first time (no previous state)", () => {
    expect(didCaptionDisplayChange(null, { kind: "empty" })).toBe(true);
  });

  it("is false when the kind and content are identical", () => {
    const line = { kind: "line" as const, text: "hello" };
    expect(didCaptionDisplayChange(line, { kind: "line", text: "hello" })).toBe(false);
  });

  it("is true when the line text changes", () => {
    const line = { kind: "line" as const, text: "hello" };
    expect(didCaptionDisplayChange(line, { kind: "line", text: "world" })).toBe(true);
  });

  it("is true when the kind changes even if unrelated fields coincide", () => {
    expect(didCaptionDisplayChange({ kind: "enableFailed" }, { kind: "empty" })).toBe(true);
  });

  it("is false when a wrongLanguage display repeats with the same text and language", () => {
    const wrong = {
      kind: "wrongLanguage" as const,
      text: "привіт",
      shownLanguageName: "Ukrainian",
    };
    expect(
      didCaptionDisplayChange(wrong, {
        kind: "wrongLanguage",
        text: "привіт",
        shownLanguageName: "Ukrainian",
      }),
    ).toBe(false);
  });

  it("is true when a wrongLanguage display's shown language changes", () => {
    const wrong = {
      kind: "wrongLanguage" as const,
      text: "привіт",
      shownLanguageName: "Ukrainian",
    };
    expect(
      didCaptionDisplayChange(wrong, {
        kind: "wrongLanguage",
        text: "привіт",
        shownLanguageName: "French",
      }),
    ).toBe(true);
  });
});

describe("splitIntoWordTokens", () => {
  it("marks words clickable and punctuation/spacing as non-clickable", () => {
    const tokens = splitIntoWordTokens("Hello, world!");
    expect(tokens).toEqual([
      { text: "Hello", clickable: true },
      { text: ",", clickable: false },
      { text: " ", clickable: false },
      { text: "world", clickable: true },
      { text: "!", clickable: false },
    ]);
  });

  it("reconstructs the exact original text when every token is concatenated back", () => {
    const line = "  Well, isn't that something? — she said.";
    const tokens = splitIntoWordTokens(line);
    expect(tokens.map((token) => token.text).join("")).toBe(line);
  });

  it("keeps a word-internal apostrophe inside a single clickable token", () => {
    const tokens = splitIntoWordTokens("don't stop");
    expect(tokens.find((token) => token.text === "don't")?.clickable).toBe(true);
  });

  it("marks a digit-leading token clickable (word-like isn't the same as lexical)", () => {
    const tokens = splitIntoWordTokens("28x28 pixels");
    expect(tokens.find((token) => token.text === "28x28")?.clickable).toBe(true);
  });
});

describe("diffWordTokens", () => {
  const word = (text: string): WordToken => ({ text, clickable: true });
  const gap: WordToken = { text: " ", clickable: false };

  it("produces no operations at all when the token list is unchanged", () => {
    const tokens = splitIntoWordTokens("the cat sat");
    expect(diffWordTokens(tokens, [...tokens])).toEqual([]);
  });

  it("appends only the new tail when a word arrives, touching nothing before it", () => {
    expect(
      diffWordTokens(splitIntoWordTokens("the cat"), splitIntoWordTokens("the cat sat")),
    ).toEqual([{ type: "append", tokens: [gap, word("sat")] }]);
  });

  it("appends everything when the line starts from nothing", () => {
    expect(diffWordTokens([], [word("hi")])).toEqual([{ type: "append", tokens: [word("hi")] }]);
  });

  it("replaces every token when the whole line switches", () => {
    const next = splitIntoWordTokens("a dog barked");
    expect(diffWordTokens(splitIntoWordTokens("the cat sat"), next)).toEqual([
      { type: "truncate", keep: 0 },
      { type: "append", tokens: next },
    ]);
  });

  it("keeps the untouched prefix when a word changes mid-sequence", () => {
    expect(
      diffWordTokens(splitIntoWordTokens("the cat sat"), splitIntoWordTokens("the cat ran")),
    ).toEqual([
      { type: "truncate", keep: 4 },
      { type: "append", tokens: [word("ran")] },
    ]);
  });

  it("only truncates when the line loses its trailing words", () => {
    expect(
      diffWordTokens(splitIntoWordTokens("the cat sat"), splitIntoWordTokens("the cat")),
    ).toEqual([{ type: "truncate", keep: 3 }]);
  });

  it("clears everything for an empty line", () => {
    expect(diffWordTokens(splitIntoWordTokens("the cat"), [])).toEqual([
      { type: "truncate", keep: 0 },
    ]);
  });

  it("replaces a token whose text is unchanged but whose clickability flipped", () => {
    const previous: WordToken[] = [word("a"), gap, { text: "-", clickable: false }];
    const next: WordToken[] = [word("a"), gap, { text: "-", clickable: true }];
    expect(diffWordTokens(previous, next)).toEqual([
      { type: "truncate", keep: 2 },
      { type: "append", tokens: [{ text: "-", clickable: true }] },
    ]);
  });

  // The point of the whole exercise: the node a cursor is already travelling towards has to be the
  // same object after an update, not an equal-looking replacement.
  describe("applied to a node list", () => {
    interface FakeNode {
      readonly token: WordToken;
    }

    function apply(nodes: FakeNode[], ops: TokenPatchOp[]): FakeNode[] {
      let result = nodes;
      for (const op of ops) {
        result =
          op.type === "truncate"
            ? result.slice(0, op.keep)
            : [...result, ...op.tokens.map((token) => ({ token }))];
      }
      return result;
    }

    function feed(lines: string[]): { nodes: FakeNode[]; first: FakeNode[] } {
      let tokens: WordToken[] = [];
      let nodes: FakeNode[] = [];
      let first: FakeNode[] = [];
      for (const [index, line] of lines.entries()) {
        const next = splitIntoWordTokens(line);
        nodes = apply(nodes, diffWordTokens(tokens, next));
        tokens = next;
        if (index === 0) first = nodes;
      }
      return { nodes, first };
    }

    it("keeps the identical node for every word that was already on screen", () => {
      const { nodes, first } = feed(["the cat", "the cat sat", "the cat sat on"]);
      expect(first).toHaveLength(3);
      for (const [index, node] of first.entries()) expect(nodes[index]).toBe(node);
    });

    it("keeps the prefix nodes but rebuilds from the word that changed", () => {
      const { nodes, first } = feed(["the cat sat", "the cat ran"]);
      for (let index = 0; index < 4; index++) expect(nodes[index]).toBe(first[index]);
      expect(nodes[4]).not.toBe(first[4]);
      expect(nodes.map((node) => node.token.text).join("")).toBe("the cat ran");
    });

    it("shares no node with the previous line when the caption switches wholesale", () => {
      const { nodes, first } = feed(["the cat sat", "a dog barked"]);
      for (const node of nodes) expect(first).not.toContain(node);
    });

    it("leaves nothing behind once the line empties", () => {
      const { nodes } = feed(["the", "the cat", "the cat sat", "a dog barked", ""]);
      expect(nodes).toEqual([]);
    });
  });
});
