import {
  ERROR_CODE,
  ERROR_CODE_ENUM,
  NETWRORK_ERROR_CODE,
} from "../constants/error";
import { VERSION } from "../constants/version";
import { getErrorMessage, getVersionAPI } from "../lib/helper";
import {
  AuthError,
  ErrorAuthRetryable,
  ErrorAuthUnknown,
  ErrorInvalidSession,
  ErrorWeakPassword,
} from "./auth-error";

/**
 * This function attempts to catch an error and convert it into a standardized format.
 * If the error has a .JSON() method (likely a custom error object), it tries to parse the JSON body.
 *
 * The function then checks if the error status code is in the NETWRORK_ERROR_CODE list.
 * If it is, it throws an ErrorAuthRetryable.
 * Otherwise, it throws an ErrorAuthUnknown.
 *
 * After attempting to get the JSON body, it again checks for network error status codes and throws ErrorAuthRetryable if found.
 *
 * It then attempts to determine the API version from the data (or error if data is not available).
 * If the API version is "2026-08-28" or later, it assigns the error code from data.code.
 * If the data is an object, it assigns the error code from data.errorCode.
 *
 * Finally, it throws an error based on whether the API version is retryable or not, using the determined error code.
 */
export const handleError = async (error: any) => {
  let data: any;

  try {
    data = await error.JSON();
  } catch (e) {
    if (NETWRORK_ERROR_CODE.includes(error.status)) {
      throw new ErrorAuthRetryable(
        getErrorMessage(e) ?? `HTTP Error Status: ${error.status}`,
        error.status,
        ERROR_CODE_ENUM.NETWORK_ERROR,
      );
    }

    throw new ErrorAuthUnknown(
      getErrorMessage(e) ?? `Unknown Error for Status: ${error.status}`,
      error.status,
      ERROR_CODE_ENUM.UNEXPECTED_ERROR,
    );
  }
  if (NETWRORK_ERROR_CODE.includes(error.status)) {
    throw new ErrorAuthRetryable(
      getErrorMessage(error) ?? `HTTP Error Status: ${error.status}`,
      error.status,
      ERROR_CODE_ENUM.NETWORK_ERROR,
    );
  }

  let errorCode: ERROR_CODE | undefined = undefined;

  const resAPIVersion = getVersionAPI(data ?? error);

  if (
    resAPIVersion &&
    resAPIVersion.getTime() >= VERSION["2026-08-28"].timestamp
  ) {
    errorCode = data.code;
  } else if (data && typeof data === "object") {
    errorCode = data.errorCode;
  }

  if (!errorCode) {
    if (data && typeof data === "object") {
      throw new ErrorWeakPassword(
        getErrorMessage(data) ?? `Password too week`,
        error.status,
        ERROR_CODE_ENUM.WEEK_PASSWORD,
      );
    }

    if (errorCode === ERROR_CODE_ENUM.WEEK_PASSWORD) {
      throw new ErrorWeakPassword(
        getErrorMessage(data) ?? `Password too week`,
        error.status,
        ERROR_CODE_ENUM.WEEK_PASSWORD,
      );
    }

    if (errorCode === ERROR_CODE_ENUM.INVALID_SESSION) {
      throw new ErrorInvalidSession(
        getErrorMessage(data) ?? `Invalid session`,
        error.status,
        ERROR_CODE_ENUM.INVALID_SESSION,
      );
    }
  }

  throw new AuthError(getErrorMessage(data), error.status ?? 500, errorCode);
};
