import { ApiError, redeemDeviceToken, setToken, startDeviceAuth } from "./api";
import type { DeviceStart } from "./types";

const PENDING_KEY = "vocairoPendingDeviceAuth";

export interface PendingDeviceAuth {
  deviceCode: string;
  userCode: string;
  intervalSec: number;
  deadline: number;
}

export class DeviceAuthError extends Error {
  constructor(readonly reason: "denied" | "expired") {
    super(reason);
  }
}

export class DeviceAuthBusyError extends Error {
  constructor() {
    super("A device auth flow is already in progress");
  }
}

// Module-level flag, not React state: guards synchronously before the first await, so it works even before a busy-state render commits.
let authInFlight = false;

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

function toPending(start: DeviceStart): PendingDeviceAuth {
  return {
    deviceCode: start.deviceCode,
    userCode: start.userCode,
    intervalSec: Math.max(2, start.intervalSec ?? 5),
    deadline: Date.now() + (start.expiresInSec ?? 600) * 1000,
  };
}

function isPendingDeviceAuth(value: unknown): value is PendingDeviceAuth {
  return (
    !!value &&
    typeof value === "object" &&
    typeof (value as PendingDeviceAuth).deviceCode === "string" &&
    typeof (value as PendingDeviceAuth).deadline === "number"
  );
}

export async function getPendingDeviceAuth(): Promise<PendingDeviceAuth | null> {
  const { [PENDING_KEY]: value } = await chrome.storage.local.get(PENDING_KEY);
  return isPendingDeviceAuth(value) && value.deadline > Date.now() ? value : null;
}

async function clearPendingDeviceAuth(): Promise<void> {
  await chrome.storage.local.remove(PENDING_KEY);
}

async function poll(pending: PendingDeviceAuth, checkImmediately: boolean): Promise<void> {
  let skipSleep = checkImmediately;
  while (Date.now() < pending.deadline) {
    if (!skipSleep) await sleep(pending.intervalSec * 1000);
    skipSleep = false;

    let result;
    try {
      result = await redeemDeviceToken(pending.deviceCode);
    } catch (error) {
      if (error instanceof ApiError && error.kind === "network") continue;
      await clearPendingDeviceAuth();
      throw error;
    }

    if (result.status === "approved" && result.accessToken) {
      await setToken(result.accessToken);
      await clearPendingDeviceAuth();
      return;
    }
    if (result.status === "denied" || result.status === "expired" || result.status === "revoked") {
      await clearPendingDeviceAuth();
      throw new DeviceAuthError(result.status === "denied" ? "denied" : "expired");
    }
  }
  await clearPendingDeviceAuth();
  throw new DeviceAuthError("expired");
}

export async function signIn(onCode: (code: string) => void): Promise<void> {
  if (authInFlight) throw new DeviceAuthBusyError();
  authInFlight = true;
  try {
    const start = await startDeviceAuth();
    onCode(start.userCode);
    const pending = toPending(start);
    await chrome.storage.local.set({ [PENDING_KEY]: pending });
    await chrome.tabs.create({ url: start.verificationUrl });
    await poll(pending, false);
  } finally {
    authInFlight = false;
  }
}

// chrome.tabs.create above shifts focus to the new tab, and the popup closes on blur,
// killing signIn's in-flight loop; the popup calls this on reopen to pick the flow back up.
export async function resumeSignIn(pending: PendingDeviceAuth): Promise<void> {
  if (authInFlight) throw new DeviceAuthBusyError();
  authInFlight = true;
  try {
    await poll(pending, true);
  } finally {
    authInFlight = false;
  }
}
