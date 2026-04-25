import {
  ApiError,
  AuthError,
  HeadsDownActionApplyError,
  HeadsDownActionAuthError,
  HeadsDownActionExpiredError,
  HeadsDownActionFeatureDisabledError,
  HeadsDownActionInvalidStateError,
} from "./errors.js";
import type { HeadsDownActionErrorPayload, HeadsDownActionKey } from "./types.js";

type ActionErrorContext = {
  actionKey?: HeadsDownActionKey;
  runId?: string;
};

function normalizeToken(value: string | null | undefined): string {
  return (value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, "_");
}

function isAuthMessage(message: string): boolean {
  const normalized = normalizeToken(message);
  return (
    normalized.includes("unauthorized") ||
    normalized.includes("not_authorized") ||
    normalized.includes("forbidden") ||
    normalized.includes("auth") ||
    normalized.includes("permission")
  );
}

function isInvalidState(code: string, message: string): boolean {
  return (
    code.includes("invalid_state") ||
    code.includes("invalid_source_state") ||
    code.includes("invalid_transition") ||
    code.includes("stale_action_state") ||
    code.includes("action_not_allowed") ||
    message.includes("invalid_state") ||
    message.includes("invalid_source_state") ||
    message.includes("invalid_transition") ||
    message.includes("stale_action_state") ||
    message.includes("not_allowed")
  );
}

function isExpired(code: string, message: string): boolean {
  return code.includes("expired") || message.includes("expired");
}

function isFeatureDisabled(code: string, message: string): boolean {
  return (
    code.includes("feature_disabled") ||
    code.includes("disabled") ||
    code.includes("not_enabled") ||
    message.includes("feature_disabled") ||
    message.includes("disabled")
  );
}

export function mapHeadsDownActionError(error: unknown, context: ActionErrorContext = {}): Error {
  if (
    error instanceof HeadsDownActionApplyError ||
    error instanceof HeadsDownActionInvalidStateError ||
    error instanceof HeadsDownActionExpiredError ||
    error instanceof HeadsDownActionFeatureDisabledError ||
    error instanceof HeadsDownActionAuthError
  ) {
    return error;
  }

  if (error instanceof AuthError) {
    return new HeadsDownActionAuthError(error.message, context);
  }

  if (error instanceof ApiError) {
    const graphqlMessages = error.graphqlErrors?.map((entry) => entry.message).join(" ") ?? "";
    if (error.status === 401 || error.status === 403 || isAuthMessage(graphqlMessages)) {
      return new HeadsDownActionAuthError(error.message, context);
    }

    return new HeadsDownActionApplyError(error.message, context);
  }

  if (error instanceof Error) {
    return new HeadsDownActionApplyError(error.message, context);
  }

  return new HeadsDownActionApplyError(String(error), context);
}

export function mapHeadsDownActionPayloadError(
  payloadError: HeadsDownActionErrorPayload,
  context: ActionErrorContext = {},
): HeadsDownActionApplyError {
  const code = normalizeToken(payloadError.code);
  const message = normalizeToken(payloadError.message);
  const options = {
    ...context,
    code: payloadError.code,
    details: payloadError.details,
  };

  if (isAuthMessage(code) || isAuthMessage(message)) {
    return new HeadsDownActionAuthError(payloadError.message, options);
  }

  if (isInvalidState(code, message)) {
    return new HeadsDownActionInvalidStateError(payloadError.message, options);
  }

  if (isExpired(code, message)) {
    return new HeadsDownActionExpiredError(payloadError.message, options);
  }

  if (isFeatureDisabled(code, message)) {
    return new HeadsDownActionFeatureDisabledError(payloadError.message, options);
  }

  return new HeadsDownActionApplyError(payloadError.message, options);
}

export function buildActionIdempotencyKey(actionKey: HeadsDownActionKey, runId: string): string {
  return `${actionKey}-${runId}-${Date.now()}-${randomHex(8)}`;
}

function randomHex(bytes: number): string {
  const array = new Uint8Array(bytes);

  if (globalThis.crypto?.getRandomValues) {
    globalThis.crypto.getRandomValues(array);
  } else {
    for (let index = 0; index < bytes; index += 1) {
      array[index] = Math.floor(Math.random() * 256);
    }
  }

  return Array.from(array, (byte) => byte.toString(16).padStart(2, "0")).join("");
}
