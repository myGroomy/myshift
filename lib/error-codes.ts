// Single source of truth for the API error vocabulary mirrors PLAN/API-CONTRACT.md §11.
// `fail()` is typed with ErrorCode, so tsc rejects any code that is not in the contract.
export const ERROR_STATUS = {
  INVALID_CREDENTIALS: 401,
  ACCOUNT_LOCKED: 423,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  VALIDATION_ERROR: 400,
  DUPLICATE_SUBMIT: 409,
  CHECKLIST_INCOMPLETE: 400,
  REQUIRED_FIELD_MISSING: 400,
  SHEETS_SETUP_REQUIRED: 503,
  // Drive/Sheets refused the work (quota, permissions, malformed name). 502, not 500: the
  // request was fine, an upstream dependency was not. `data.orphans` lists Drive file IDs
  // created before the failure so they can be cleaned up (API-CONTRACT.md §3).
  PROVISION_FAILED: 502,
  FILE_TOO_LARGE: 413,
  UNSUPPORTED_FILE_TYPE: 415,
  INTERNAL_ERROR: 500,
} as const;

export type ErrorCode = keyof typeof ERROR_STATUS;

// Serialized under `error.data` (contract §11: VALIDATION_ERROR carries per-field detail).
export type ErrorData = Record<string, unknown>;

export function statusForCode(code: ErrorCode): number {
  return ERROR_STATUS[code];
}

// Typed throwable for domain/business-rule violations. Routes map it through
// `handleRouteError()` instead of matching on message strings.
export class DomainError extends Error {
  readonly code: ErrorCode;
  readonly status: number;
  readonly data?: ErrorData;

  constructor(code: ErrorCode, message: string, options?: { status?: number; data?: ErrorData }) {
    super(message);
    this.name = "DomainError";
    this.code = code;
    this.status = options?.status ?? statusForCode(code);
    this.data = options?.data;
  }
}

export function isDomainError(value: unknown): value is DomainError {
  return value instanceof DomainError;
}
