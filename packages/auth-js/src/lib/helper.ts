import { HEADERS_PLATFORM_API_VERSION } from "../constants/options";
import { EXPIRE_GAP } from "../constants/time";
import { Fetch, SessionResponse } from "../types/fetch";

export const resolveFetch = (customFetch?: Fetch): Fetch => {
  if (customFetch) {
    return (...args) => customFetch(...args);
  }
  return (...args) => fetch(...args);
};

export const getErrorMessage = (error: unknown) => {
  if (error instanceof Error) {
    return error.message;
  }

  return JSON.stringify(error);
};

// YYYY-MM-DD Version
const API_VERSION_REGEX =
  /^2[0-9]{3}-(0[1-9]|1[0-2])-(0[1-9]|1[0-9]|2[0-9]|3[0-1])$/i;

export const getVersionAPI = (res: Response) => {
  const apiVersion = res.headers.get(HEADERS_PLATFORM_API_VERSION);

  if (!apiVersion) {
    console.error(
      `Header ${HEADERS_PLATFORM_API_VERSION} not found in response headers`,
    );
    return;
  }

  if (!apiVersion.match(API_VERSION_REGEX)) {
    console.error(
      `Invalid API version ${apiVersion}. Valid format: YYYY-MM-DD`,
    );
    return;
  }

  try {
    const date = new Date(apiVersion);
    return date;
  } catch (error) {
    console.error(
      `Invalid API version ${apiVersion}. Valid format: YYYY-MM-DD`,
    );
    return;
  }
};

export const isSessionExpired = (expiresAt?: number) => {
  if (expiresAt && expiresAt * 1000 - Date.now() < EXPIRE_GAP) {
    return true;
  }
  return false;
};

/**
 * A deferred represents some asynchronous work that is not yet finished, which
 * may or may not culminate in a value.
 * Taken from: https://github.com/mike-north/types/blob/master/src/async.ts
 */
export class Deferred<T = any> {
  public static promiseConstructor: PromiseConstructor = Promise;

  public readonly promise!: PromiseLike<T>;

  public readonly resolve!: (value?: T | PromiseLike<T>) => void;

  public readonly reject!: (reason?: any) => any;

  public constructor() {
    // eslint-disable-next-line @typescript-eslint/no-extra-semi
    (this as any).promise = new Deferred.promiseConstructor((res, rej) => {
      // eslint-disable-next-line @typescript-eslint/no-extra-semi
      (this as any).resolve = res;
      // eslint-disable-next-line @typescript-eslint/no-extra-semi
      (this as any).reject = rej;
    });
  }
}

export const sleep = async (time: number): Promise<null> => {
  return new Promise((accept) => {
    setTimeout(() => accept(null), time);
  });
};

/**
 *  Check if the retryable is true or false, default is true
 *
 * Taken from: https://github.com/supabase/supabase-js/packages/core/auth-js/src/lib/helper.ts
 *
 * @param fn
 * @param isRetryable
 */
export const retryable = <T>(
  fn: (attempt: number) => Promise<T>,
  isRetryable: (attempt: number, error: any | null, result?: T) => boolean,
): Promise<T> => {
  const promise = new Promise<T>((accept, reject) => {
    // eslint-disable-next-line @typescript-eslint/no-extra-semi
    (async () => {
      for (let attempt = 0; attempt < Infinity; attempt++) {
        try {
          const result = await fn(attempt);

          if (!isRetryable(attempt, null, result)) {
            accept(result);
            return;
          }
        } catch (e) {
          if (!isRetryable(attempt, e)) {
            reject(e);
            return;
          }
        }
      }
    })();
  });

  return promise;
};

export const hasSession = (data: SessionResponse) => {
  return !!data.access_token && !!data.refresh_token && !!data.user;
};

export const handleCalculateExpiresAt = (expiresIn: number) => {
  const timeNow = Math.round(Date.now() / 1000);
  return timeNow + expiresIn;
};
