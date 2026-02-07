import { atom, selector } from "recoil";

export interface StoredText {
  selectedText?: string;
  sourceUrl?: string;
  timestamp?: number;
}

export interface TextProcessingState {
  storedText: StoredText | null;
  isProcessing: boolean;
  processedText: string | null;
  error: string | null;
}

export const storedTextState = atom<StoredText | null>({
  key: "storedTextState",
  default: null,
});

export const isProcessingState = atom<boolean>({
  key: "isProcessingState",
  default: false,
});

export const processedTextState = atom<string | null>({
  key: "processedTextState",
  default: null,
});

export const textErrorState = atom<string | null>({
  key: "textErrorState",
  default: null,
});

export const hasStoredTextSelector = selector({
  key: "hasStoredTextSelector",
  get: ({ get }) => {
    const storedText = get(storedTextState);
    return storedText !== null && storedText.selectedText !== undefined;
  },
});

export const textProcessingStatusSelector = selector({
  key: "textProcessingStatusSelector",
  get: ({ get }) => {
    const storedText = get(storedTextState);
    const isProcessing = get(isProcessingState);
    const processedText = get(processedTextState);
    const error = get(textErrorState);

    return {
      hasText: storedText !== null && storedText.selectedText !== undefined,
      isProcessing,
      processedText,
      error,
      canProcess:
        storedText !== null &&
        storedText.selectedText !== undefined &&
        !isProcessing,
    };
  },
});
