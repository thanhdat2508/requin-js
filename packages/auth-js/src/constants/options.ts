import { version } from "./version";

export const AUTH_URL = "http://localhost:9999";
export const HEADERS_PLATFORM_API_VERSION = "X-Requin-API-Version";

export const HEADERS = {
  "X-Requin-Version": `requin-js/${version}`,
};

export const DEFAULT_OPTIONS = {
  autoRefreshToken: true,
  url: AUTH_URL,
  headers: HEADERS,
};
