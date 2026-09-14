import { User } from "../lib/types";
import { RequestResult } from "./request";
import { Session } from "./session";

export type FetchParameters = {
  /**
   * Abort the signal to cancel a request
   */
  signal?: AbortSignal;
};

export type Fetch = typeof fetch;

export type AuthUserData = {
  user?: User;
};

export type AuthResponse = RequestResult<{
  user?: User | null;
  session?: Session | null;
}>;

export type UserResponseType = RequestResult<{
  user: User;
}>;

export type SessionResponse = {
  access_token?: string;
  refresh_token?: string;
  expires_in?: number;
  expires_at?: number;
  user?: User;

  [key: string]: any;
};
