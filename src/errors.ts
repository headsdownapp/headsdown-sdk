/**
 * Base error for all HeadsDown SDK errors.
 * Catch this to handle any SDK error generically.
 */
export class HeadsDownError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "HeadsDownError";
  }
}

/**
 * Authentication is missing or invalid.
 * The user needs to run Device Flow auth or provide a valid API key.
 */
export class AuthError extends HeadsDownError {
  constructor(message: string) {
    super(message);
    this.name = "AuthError";
  }
}

/**
 * The HeadsDown API returned an error response (4xx/5xx or GraphQL errors).
 */
export class ApiError extends HeadsDownError {
  /** HTTP status code, if available. */
  readonly status?: number;
  /** GraphQL error details, if available. */
  readonly graphqlErrors?: Array<{ message: string; path?: string[] }>;
  /** Upstream request id for support/debug correlation, if provided by the API. */
  readonly requestId?: string;

  constructor(
    message: string,
    options?: {
      status?: number;
      graphqlErrors?: Array<{ message: string; path?: string[] }>;
      requestId?: string;
    },
  ) {
    super(message);
    this.name = "ApiError";
    this.status = options?.status;
    this.graphqlErrors = options?.graphqlErrors;
    this.requestId = options?.requestId;
  }
}

/**
 * A network or connectivity error (DNS failure, timeout, connection refused).
 */
export class NetworkError extends HeadsDownError {
  /** The underlying error, if available. */
  readonly cause?: Error;

  constructor(message: string, cause?: Error) {
    super(message);
    this.name = "NetworkError";
    this.cause = cause;
  }
}

/**
 * Input validation failed before the request was sent.
 */
export class ValidationError extends HeadsDownError {
  /** The field that failed validation. */
  readonly field?: string;

  constructor(message: string, field?: string) {
    super(message);
    this.name = "ValidationError";
    this.field = field;
  }
}
