import { REQUEST_METHOD } from "../constants/method";
import { HEADERS_PLATFORM_API_VERSION } from "../constants/options";
import { VERSION } from "../constants/version";
import { handleError } from "../error";
import {
  AuthResponse,
  AuthUserData,
  Fetch,
  FetchParameters,
  SessionResponse,
  UserResponseType,
} from "../types/fetch";
import {
  AuthRequestOptions,
  RequestMethod,
  RequestOptions,
  User,
} from "../lib/types";
import { handleCalculateExpiresAt, hasSession } from "./helper";
import { Session } from "../types/session";

export const userResponse = (data: AuthUserData): UserResponseType => {
  const user: User = data.user ?? (data as User);
  return {
    data: {
      user,
    },
    error: null,
  };
};

export const sessionResponse = (data: SessionResponse): AuthResponse => {
  const isSessionValid = hasSession(data);

  let session: Session | null = null;

  if (isSessionValid) {
    session = { ...data } as Session;

    if (!data.expires_at && data.expires_in) {
      session.expires_at = handleCalculateExpiresAt(data.expires_in);
    }
  }

  const userData = data.user;

  return {
    data: {
      session,
      user: userData,
    },
    error: null,
  };
};

/**
 * Get Request Params of Request Object
 */
export const handleGetRequestParams = (
  method: RequestMethod,
  options?: RequestOptions,
  parameters?: FetchParameters,
  body?: object,
) => {
  const headers = {
    ...(options?.headers as Record<string, string>),
  };

  const params: Record<string, any> = {
    method,
    headers,
  };

  if (method !== REQUEST_METHOD.GET && body) {
    params.body = JSON.stringify(body);
    if (!headers["Content-Type"]) {
      headers["Content-Type"] = "application/json";
    }
  }

  return params;
};

/**
 * Request handle for GET, POST, PUT, PATCH, DELETE
 */
export const handleRequest = async (
  fetch: Fetch,
  method: RequestMethod,
  url: string,
  options?: RequestOptions,
  parameters?: FetchParameters,
  body?: object,
) => {
  const requestParams = handleGetRequestParams(
    method,
    options,
    parameters,
    body,
  );

  try {
    const res = await fetch(url, requestParams);

    if (!res.ok) {
      await handleError(res);
    }

    try {
      const result = await res.json();
      return result;
    } catch (error) {
      await handleError(error);
    }
  } catch (error: any) {
    // Throw error for handler.
    await handleError(error);
  }
};

export const request = async (
  fetch: Fetch,
  method: RequestMethod,
  url: string,
  options?: AuthRequestOptions,
) => {
  const headers: Record<string, string> = {
    ...(options?.headers as Record<string, string>),
  };

  if (!headers[HEADERS_PLATFORM_API_VERSION]) {
    headers[HEADERS_PLATFORM_API_VERSION] = VERSION["2026-08-28"].name;
  }

  if (options?.jwt) {
    headers["Authorization"] = `Bearer ${options.jwt}`;
  }

  const query = options?.query ?? {};

  if (options?.redirectTo) {
    query["redirect_to"] = options.redirectTo;
  }

  // Check if have at least 1 key in query then parsing URL
  const queryString = Object.keys(query).length
    ? "?" + new URLSearchParams(query).toString()
    : "";

  // URL with String Format for fetch function
  const finalUrlString = `${url}${queryString}`;

  const result = await handleRequest(
    fetch,
    method,
    finalUrlString,
    {
      headers,
    },
    {},
    options?.body,
  );

  return options?.responseFormat
    ? options.responseFormat(result)
    : {
        data: {
          ...result,
        },
        error: null,
      };
};
