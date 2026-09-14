import { ERROR_CODE } from "../constants/error";

export class AuthError extends Error {
  public errorCode: ERROR_CODE | undefined;

  public status: number | undefined;

  constructor(message: string, status?: number, errorCode?: ERROR_CODE) {
    super(message);

    this.errorCode = errorCode;
    this.status = status;
  }

  /**
   *
   * @returns
   */
  jsonFormat(): {
    message: string;
    status: number | undefined;
    errorCode: ERROR_CODE | undefined;
  } {
    return {
      message: this.message,
      status: this.status,
      errorCode: this.errorCode,
    };
  }
}

// Handle status code 500, 501, 502, 503, 504, 520, 521, 522, 523, 524, 525, 526, 527, 528, 529, 530
export class ErrorAuthRetryable extends AuthError {
  constructor(message: string, status: number, errorCode: ERROR_CODE) {
    super(message, status, errorCode);
  }
}

// Handle status code 401, 403, 404, 405, 409, 410, 422, 423, 424, 425, 426, 428, 429, 451
export class ErrorAuthUnknown extends AuthError {
  constructor(message: string, status: number, errorCode: ERROR_CODE) {
    super(message, status, errorCode);
  }
}

// TODO: Confirm this error code from API documentation. If not exist, remove this class.
// Using for catch this error code: "Password too weak"
export class ErrorWeakPassword extends AuthError {
  constructor(message: string, status: number, errorCode: ERROR_CODE) {
    super(message, status, errorCode);
  }
}

// TODO: Confirm this error code from API documentation. If not exist, remove this class.
// Using for catch this error code: "Invalid session"
export class ErrorInvalidSession extends AuthError {
  constructor(message: string, status: number, errorCode: ERROR_CODE) {
    super(message, status, errorCode);
  }
}

export class ErrorInvalidRefreshToken extends AuthError {
  constructor(message: string, status: number, errorCode: ERROR_CODE) {
    super(message, status, errorCode);
  }
}

export const isAuthError = (error: unknown): error is AuthError => {
  return (
    typeof error === "object" &&
    error !== null &&
    "jsonFormat" in error &&
    "message" in error
  );
};
