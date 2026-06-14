export type ApiErrorCode =
  | "BAD_REQUEST"
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "RATE_LIMITED"
  | "CONFLICT"
  | "INTERNAL"
  | "SERVICE_UNAVAILABLE"
  | "UPSTREAM_ERROR";

export type ApiError = {
  code: ApiErrorCode;
  message: string;
  details?: Record<string, unknown>;
};

export type ApiMeta = {
  requestId: string;
  cursor?: string;
  nextCursor?: string;
};

export type ApiEnvelope<T> = {
  data: T | null;
  error: ApiError | null;
  meta: ApiMeta;
};

export function ok<T>(data: T, requestId: string, meta: Partial<ApiMeta> = {}): ApiEnvelope<T> {
  return {
    data,
    error: null,
    meta: { requestId, ...meta }
  };
}

export function fail(code: ApiErrorCode, message: string, requestId: string, details?: Record<string, unknown>): ApiEnvelope<null> {
  return {
    data: null,
    error: details ? { code, message, details } : { code, message },
    meta: { requestId }
  };
}
