export interface LookupSense {
  definition: string;
  partOfSpeech?: string;
  example?: string;
}

export interface LookupResult {
  surface: string;
  translation: string;
  definition: string | null;
  phonetic?: string;
  translations: string[];
  senses: LookupSense[];
  synonyms: string[];
  antonyms?: string[];
}

export interface PassageResult {
  applied: boolean;
  wordCount: number;
  text: string;
  translation: string | null;
  truncated?: boolean;
}

export interface DeviceStart {
  deviceCode: string;
  userCode: string;
  verificationUrl: string;
  expiresInSec?: number;
  intervalSec?: number;
}

export interface DeviceTokenResult {
  status: string;
  accessToken?: string;
}

export type Selection =
  | { kind: "word"; text: string }
  | { kind: "passage"; text: string }
  | { kind: "rejected" };
