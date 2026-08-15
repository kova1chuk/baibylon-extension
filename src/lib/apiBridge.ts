import { ApiError } from "./api";
import {
  API_MESSAGE_TYPE,
  type ApiRequest,
  type ApiRequestMessage,
  type ApiResponseMessage,
  type ApiResultFor,
  deserializeError,
} from "./messages";
import type { LookupResult, PassageResult } from "./types";

// A worker that dies without closing the message port would otherwise leave the card on "Шукаємо…" forever.
export const WORKER_REQUEST_TIMEOUT_MS = 45_000;

async function sendToWorker<Op extends ApiRequest["op"]>(
  request: Extract<ApiRequest, { op: Op }>,
): Promise<ApiResultFor<Op>> {
  type Response = ApiResponseMessage<ApiResultFor<Op>>;

  let response: Response | undefined;
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    response = await Promise.race([
      chrome.runtime.sendMessage<ApiRequestMessage, Response | undefined>({
        type: API_MESSAGE_TYPE,
        request,
      }),
      new Promise<never>((_, reject) => {
        timer = setTimeout(() => reject(new ApiError("network")), WORKER_REQUEST_TIMEOUT_MS);
      }),
    ]);
  } catch {
    throw new ApiError("network");
  } finally {
    clearTimeout(timer);
  }

  if (!response || typeof response !== "object" || !("ok" in response)) {
    throw new ApiError("network");
  }
  if (!response.ok) throw deserializeError(response.error);
  return response.data;
}

export function lookup(surface: string): Promise<LookupResult> {
  return sendToWorker<"lookup">({ op: "lookup", surface });
}

export function passage(text: string): Promise<PassageResult> {
  return sendToWorker<"passage">({ op: "passage", text });
}

export function accountLearningLanguage(): Promise<string | null> {
  return sendToWorker<"accountLearningLanguage">({ op: "accountLearningLanguage" });
}
