import { useRecoilState, useRecoilValue, useSetRecoilState } from "recoil";
import { useCallback } from "react";
import {
  storedTextState,
  isProcessingState,
  processedTextState,
  textErrorState,
  hasStoredTextSelector,
  textProcessingStatusSelector,
} from "../store/textStore";

export const useTextProcessing = () => {
  const [storedText] = useRecoilState(storedTextState);
  const [isProcessing] = useRecoilState(isProcessingState);
  const [processedText] = useRecoilState(processedTextState);
  const [error] = useRecoilState(textErrorState);

  const hasStoredText = useRecoilValue(hasStoredTextSelector);
  const processingStatus = useRecoilValue(textProcessingStatusSelector);

  const setStoredTextState = useSetRecoilState(storedTextState);
  const setIsProcessingState = useSetRecoilState(isProcessingState);
  const setProcessedTextState = useSetRecoilState(processedTextState);
  const setErrorState = useSetRecoilState(textErrorState);

  const checkForStoredText = useCallback(async () => {
    try {
      const response = await chrome.runtime.sendMessage({
        action: "getStoredText",
      });
      if (response && response.selectedText) {
        setStoredTextState(response);
      }
    } catch {
      console.log("No stored text found or error occurred");
    }
  }, [setStoredTextState]);

  const clearStoredText = useCallback(async () => {
    try {
      await chrome.runtime.sendMessage({ action: "clearStoredText" });
      setStoredTextState(null);
      setProcessedTextState(null);
      setErrorState(null);
    } catch (error) {
      console.error("Error clearing stored text:", error);
    }
  }, [setStoredTextState, setProcessedTextState, setErrorState]);

  const processText = useCallback(async () => {
    if (!storedText?.selectedText) return;

    setIsProcessingState(true);
    setErrorState(null);
    setProcessedTextState(null);

    try {

      await new Promise((resolve) => setTimeout(resolve, 2000));

      const result = `Processed: ${storedText.selectedText}`;
      setProcessedTextState(result);

      console.log("Processing text with AI:", storedText.selectedText);
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "An unexpected error occurred";
      setErrorState(errorMessage);
    } finally {
      setIsProcessingState(false);
    }
  }, [storedText, setIsProcessingState, setErrorState, setProcessedTextState]);

  const clearError = useCallback(() => {
    setErrorState(null);
  }, [setErrorState]);

  return {

    storedText,
    isProcessing,
    processedText,
    error,
    hasStoredText,
    processingStatus,

    checkForStoredText,
    clearStoredText,
    processText,
    clearError,

    setStoredText: setStoredTextState,
    setIsProcessing: setIsProcessingState,
    setProcessedText: setProcessedTextState,
  };
};
