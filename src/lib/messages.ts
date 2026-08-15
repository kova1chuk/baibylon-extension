import { ApiError, type ApiErrorKind } from "./api";
import type { LookupResult, PassageResult } from "./types";

export const API_MESSAGE_TYPE = "vocairo/api";

export type ApiRequest =
  | { op: "lookup"; surface: string }
  | { op: "passage"; text: string }
  | { op: "accountLearningLanguage" };

export interface ApiRequestMessage {
  type: typeof API_MESSAGE_TYPE;
  request: ApiRequest;
}

export interface ApiResultMap {
  lookup: LookupResult;
  passage: PassageResult;
  accountLearningLanguage: string | null;
}

export type ApiResultFor<Op extends ApiRequest["op"]> = ApiResultMap[Op];

// "unknown" is deliberately not an ApiError kind, so a worker failure that never was one keeps the card's generic copy.
export type SerializedError =
  | { kind: ApiErrorKind; status?: number; message?: string }
  | { kind: "unknown"; message?: string };

export type ApiResponseMessage<T> = { ok: true; data: T } | { ok: false; error: SerializedError };

export function isApiRequestMessage(message: unknown): message is ApiRequestMessage {
  if (!message || typeof message !== "object") return false;
  const candidate = message as Partial<ApiRequestMessage>;
  if (candidate.type !== API_MESSAGE_TYPE) return false;
  const op = candidate.request?.op;
  return op === "lookup" || op === "passage" || op === "accountLearningLanguage";
}

export function serializeError(error: unknown): SerializedError {
  if (error instanceof ApiError) {
    return { kind: error.kind, status: error.status, message: error.message };
  }
  return { kind: "unknown", message: error instanceof Error ? error.message : undefined };
}

export function deserializeError(error: SerializedError): Error {
  if (error.kind === "unknown") return new Error(error.message ?? "unknown");
  return new ApiError(error.kind, error.status, error.message);
}
