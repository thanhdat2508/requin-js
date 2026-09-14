import { ERROR_CODE_ENUM } from "../../constants/error";
import { REQUEST_METHOD } from "../../constants/method";
import { DEFAULT_OPTIONS } from "../../constants/options";
import { AUTO_TICK_REFRESH_DURATION } from "../../constants/time";
import {
  AuthError,
  ErrorInvalidRefreshToken,
  ErrorInvalidSession,
  isAuthError,
} from "../../error/auth-error";
import { request, sessionResponse, userResponse } from "../../lib/fetch";
import {
  Deferred,
  isSessionExpired,
  resolveFetch,
  retryable,
  sleep,
} from "../../lib/helper";
import { AuthResponse, Fetch } from "../../types/fetch";
import { Session } from "../../types/session";
import {
  AuthChangeEvent,
  AuthStateChangeCallback,
  AuthSubscription,
  DeviceCodeParams,
  DeviceCodeResponse,
  ListMFAFactosParams,
  RefreshTokenResponse,
  RequinAuthJSOptions,
  SignInWithPasswordCredentials,
  SignUpWithPasswordCredentials,
} from "../../types/type";
import AdminAuthAPI from "./auth-api";

export default class AuthClientJS {
  public admin: AdminAuthAPI;
  protected fetch: Fetch;
  public url: string;
  protected headers: Record<string, string>;
  protected currentSession: Session | null = null;
  protected refreshTokenDefered: Deferred<RefreshTokenResponse> | null = null;
  protected lastRefreshFailed: {
    refreshToken: string;
    result: RefreshTokenResponse;
    expiresAt: number;
  } | null = null;

  protected deniedGetSessionWarning: boolean = false;
  private listeners: Map<string, AuthStateChangeCallback> = new Map();

  constructor(options: RequinAuthJSOptions) {
    const settings = { ...DEFAULT_OPTIONS, ...options };

    this.url = settings.url ?? "";
    this.headers = (settings.headers as Record<string, string>) ?? {};
    this.fetch = resolveFetch(settings.fetch);

    this.admin = new AdminAuthAPI({
      url: this.url,
      headers: this.headers,
      fetch: this.fetch,
    });
  }

  public getAccessToken(): string | null {
    return this.currentSession?.access_token ?? null;
  }

  private notifyListeners(event: AuthChangeEvent, session: Session | null) {
    for (const callback of this.listeners.values()) {
      try {
        callback(event, session);
      } catch (err) {
        console.error("Auth listener error:", err);
      }
    }
  }

  public onAuthStateChange(callback: AuthStateChangeCallback): {
    data: { subscription: AuthSubscription };
  } {
    const id = Math.random().toString(36).substring(2, 9);
    const subscription: AuthSubscription = {
      id,
      callback,
      unsubscribe: () => {
        this.listeners.delete(id);
      },
    };
    this.listeners.set(id, callback);

    if (this.currentSession) {
      try {
        callback("INITIAL_SESSION", this.currentSession);
      } catch (err) {
        console.error("Auth listener initial error:", err);
      }
    }

    return {
      data: {
        subscription,
      },
    };
  }

  public async signUp(credentials: SignUpWithPasswordCredentials): Promise<{
    data: { user: any | null; session: Session | null };
    error: AuthError | null;
  }> {
    try {
      const body = {
        email: credentials.email,
        password: credentials.password,
        data: credentials.options?.data,
      };

      const res = await request(
        this.fetch,
        REQUEST_METHOD.POST,
        `${this.url}/signup`,
        {
          headers: this.headers,
          body,
          responseFormat: sessionResponse,
        },
      );

      if (res.data?.session) {
        await this.handleSaveSession(res.data.session, "SIGNED_IN");
      }

      return {
        data: {
          user: res.data?.user ?? res.data?.session?.user ?? null,
          session: res.data?.session ?? null,
        },
        error: res.error,
      };
    } catch (e: any) {
      const error = isAuthError(e)
        ? e
        : new AuthError(e?.message ?? "Failed to sign up");
      return {
        data: { user: null, session: null },
        error,
      };
    }
  }

  public async signInWithPassword(
    credentials: SignInWithPasswordCredentials,
  ): Promise<{
    data: { user: any | null; session: Session | null };
    error: AuthError | null;
  }> {
    try {
      const body = {
        grant_type: "password",
        email: credentials.email,
        password: credentials.password,
      };

      const res = await request(
        this.fetch,
        REQUEST_METHOD.POST,
        `${this.url}/token`,
        {
          headers: this.headers,
          body,
          responseFormat: sessionResponse,
        },
      );

      if (res.data?.session) {
        await this.handleSaveSession(res.data.session, "SIGNED_IN");
      }

      return {
        data: {
          user: res.data?.user ?? res.data?.session?.user ?? null,
          session: res.data?.session ?? null,
        },
        error: res.error,
      };
    } catch (e: any) {
      const error = isAuthError(e)
        ? e
        : new AuthError(e?.message ?? "Authentication failed");
      return {
        data: { user: null, session: null },
        error,
      };
    }
  }

  public async signOut(): Promise<{ error: AuthError | null }> {
    try {
      const refreshToken = this.currentSession?.refresh_token;
      const accessToken = this.currentSession?.access_token;

      if (refreshToken || accessToken) {
        const headers = { ...this.headers };
        if (accessToken) {
          headers["Authorization"] = `Bearer ${accessToken}`;
        }
        await request(this.fetch, REQUEST_METHOD.POST, `${this.url}/logout`, {
          headers,
          body: refreshToken ? { refresh_token: refreshToken } : undefined,
        }).catch(() => {});
      }

      this.currentSession = null;
      this.notifyListeners("SIGNED_OUT", null);

      return { error: null };
    } catch (e: any) {
      this.currentSession = null;
      this.notifyListeners("SIGNED_OUT", null);
      return {
        error: isAuthError(e)
          ? e
          : new AuthError(e?.message ?? "Error signing out"),
      };
    }
  }

  public async signInWithDeviceCode(
    params?: DeviceCodeParams,
  ): Promise<DeviceCodeResponse> {
    try {
      return await request(
        this.fetch,
        REQUEST_METHOD.POST,
        `${this.url}/device/code`,
        {
          headers: this.headers,
          body: { scopes: params?.scopes || ["*"] },
          responseFormat: (data: any) => ({
            data,
            error: null,
          }),
        },
      );
    } catch (e: any) {
      return {
        data: null,
        error: isAuthError(e)
          ? e
          : new AuthError(e?.message ?? "Failed to request device code"),
      };
    }
  }

  public async pollDeviceToken(deviceCode: string): Promise<{
    data: { user: any | null; session: Session | null } | null;
    error: AuthError | null;
  }> {
    try {
      const res = await request(
        this.fetch,
        REQUEST_METHOD.POST,
        `${this.url}/device/token`,
        {
          headers: this.headers,
          body: { device_code: deviceCode },
          responseFormat: sessionResponse,
        },
      );

      if (res.data?.session) {
        await this.handleSaveSession(res.data.session, "SIGNED_IN");
      }

      return {
        data: res.data
          ? {
              user: res.data.user ?? res.data.session?.user ?? null,
              session: res.data.session ?? null,
            }
          : null,
        error: res.error,
      };
    } catch (e: any) {
      return {
        data: null,
        error: isAuthError(e)
          ? e
          : new AuthError(e?.message ?? "Failed to poll device token"),
      };
    }
  }

  // Handle Refresh AccessToken
  private async handleRefreshAccessToken(
    refreshToken: string,
  ): Promise<AuthResponse> {
    const statedAt = Date.now();
    try {
      return await retryable(
        async (attempt) => {
          if (attempt > 0) {
            await sleep(200 * Math.pow(2, attempt - 1));
          }
          return await request(
            this.fetch,
            REQUEST_METHOD.POST,
            `${this.url}/token?type=refresh_token`, // API URL
            {
              body: { refresh_token: refreshToken },
              headers: this.headers,
              responseFormat: sessionResponse,
            },
          );
        },
        (attempt, error) => {
          const nextBackOffInterval = 200 * Math.pow(2, attempt);
          return (
            error &&
            isAuthError(error) &&
            Date.now() + nextBackOffInterval - statedAt <
              AUTO_TICK_REFRESH_DURATION
          );
        },
      );
    } catch (e) {
      console.error(e);

      const error: AuthError = isAuthError(e)
        ? e
        : new AuthError((e as Error)?.message ?? "Unknown error occurred");

      return {
        data: null,
        error,
      };
    }
  }

  protected async handleSaveSession(
    session: Session,
    event: AuthChangeEvent = "TOKEN_REFRESHED",
  ) {
    this.deniedGetSessionWarning = true;

    // Shallow copy session
    const processSession = {
      ...session,
    };
    this.currentSession = processSession;
    this.notifyListeners(event, this.currentSession);
  }

  public setSession(session: Session | null) {
    this.currentSession = session ? { ...session } : null;
    this.notifyListeners(
      session ? "SIGNED_IN" : "SIGNED_OUT",
      this.currentSession,
    );
  }

  private async handleRefreshToken(
    refreshToken: string,
  ): Promise<RefreshTokenResponse> {
    if (!refreshToken) {
      throw new ErrorInvalidRefreshToken(
        "Refresh token not found",
        400,
        ERROR_CODE_ENUM.INVALID_REFRESH_TOKEN,
      );
    }

    if (this.refreshTokenDefered) {
      return this.refreshTokenDefered.promise;
    }

    if (
      this.lastRefreshFailed &&
      this.lastRefreshFailed.refreshToken === refreshToken &&
      Date.now() < this.lastRefreshFailed.expiresAt
    ) {
      // Running cache failed
      return this.lastRefreshFailed.result;
    }

    try {
      this.refreshTokenDefered = new Deferred<RefreshTokenResponse>();

      /**
       * If Caller 1 is calling refreshtoken and Caller 2 is calling refreshtoken too.
       * So the caller 2 will be wating for caller 1 and wait for the result from caller 1.
       */
      this.refreshTokenDefered.promise.then(undefined, () => {});

      const { data, error } = await this.handleRefreshAccessToken(refreshToken);

      if (error) {
        const failedResult: RefreshTokenResponse = {
          data: null,
          error,
        };
        this.lastRefreshFailed = {
          refreshToken,
          result: failedResult,
          expiresAt: Date.now() + 30000,
        };
        this.refreshTokenDefered.resolve(failedResult);
        return failedResult;
      }

      if (!data || !data.session) {
        const sessionError = new ErrorInvalidSession(
          "Session not found",
          404,
          ERROR_CODE_ENUM.INVALID_SESSION,
        );
        const failedResult: RefreshTokenResponse = {
          data: null,
          error: sessionError,
        };
        this.lastRefreshFailed = {
          refreshToken,
          result: failedResult,
          expiresAt: Date.now() + 30000,
        };
        this.refreshTokenDefered.resolve(failedResult);
        return failedResult;
      }

      this.lastRefreshFailed = null;
      await this.handleSaveSession(data.session);

      const successResult: RefreshTokenResponse = {
        data: data.session,
        error: null,
      };
      this.refreshTokenDefered.resolve(successResult);
      return successResult;
    } catch (e) {
      console.error(e);
      const error: AuthError = isAuthError(e)
        ? e
        : new AuthError(
            (e as Error)?.message ?? "Unknown error during refresh",
          );
      const failedResult: RefreshTokenResponse = {
        data: null,
        error,
      };
      if (this.refreshTokenDefered) {
        this.refreshTokenDefered.resolve(failedResult);
      }
      return failedResult;
    } finally {
      this.refreshTokenDefered = null;
    }
  }

  public async refreshSession(
    refreshToken?: string,
  ): Promise<RefreshTokenResponse> {
    const token = refreshToken ?? this.currentSession?.refresh_token;
    if (!token) {
      return {
        data: null,
        error: new ErrorInvalidRefreshToken(
          "Refresh token not found",
          400,
          ERROR_CODE_ENUM.INVALID_REFRESH_TOKEN,
        ),
      };
    }
    return this.handleRefreshToken(token);
  }

  public async getSession(): Promise<
    | {
        data: {
          session: Session;
        };
        error: null;
      }
    | {
        data: {
          session: null;
        };
        error: AuthError;
      }
    | {
        data: {
          session: null;
        };
        error: null;
      }
  > {
    return this.loadSession();
  }

  private async loadSession(): Promise<
    | {
        data: {
          session: Session;
        };
        error: null;
      }
    | {
        data: {
          session: null;
        };
        error: AuthError;
      }
    | {
        data: {
          session: null;
        };
        error: null;
      }
  > {
    try {
      const currentSession = this.currentSession;

      if (!currentSession) {
        return {
          data: {
            session: null,
          },
          error: null,
        };
      }

      const expiresAt = currentSession.expires_at;
      const isExpire: boolean = isSessionExpired(expiresAt);

      if (!isExpire) {
        return {
          data: {
            session: currentSession,
          },
          error: null,
        };
      }

      // If expired, refresh token
      if (currentSession.refresh_token) {
        const { data, error } = await this.handleRefreshToken(
          currentSession.refresh_token,
        );

        if (error) {
          return {
            data: {
              session: null,
            },
            error,
          };
        }

        if (data) {
          return {
            data: {
              session: data,
            },
            error: null,
          };
        }
      }

      return {
        data: {
          session: null,
        },
        error: null,
      };
    } catch (error) {
      console.error(error);
      return {
        data: {
          session: null,
        },
        error: isAuthError(error)
          ? error
          : new AuthError((error as Error)?.message ?? "Error loading session"),
      };
    }
  }

  public async userSession<T>(
    fn: (
      result:
        | {
            data: {
              session: Session;
            };
            error: null;
          }
        | {
            data: {
              session: null;
            };
            error: AuthError;
          }
        | {
            data: {
              session: null;
            };
            error: null;
          },
    ) => Promise<T>,
  ): Promise<T | undefined> {
    try {
      const result = await this.loadSession();

      return await fn(result);
    } catch (error) {
      console.error(error);
      return undefined;
    }
  }

  private async getUserJwt(jwt?: string) {
    try {
      if (jwt) {
        return await request(
          this.fetch,
          REQUEST_METHOD.GET,
          `${this.url}/user`, // URL API
          {
            headers: this.headers,
            jwt,
            responseFormat: userResponse,
          },
        );
      }
    } catch (error) {
      // REMOVE Session cookie if is auth error
      throw error;
    }
  }

  public async getUser(jwt?: string) {
    const token = jwt ?? this.currentSession?.access_token;
    if (token) {
      return this.getUserJwt(token);
    }
    return {
      data: null,
      error: new AuthError("JWT token not found", 401),
    };
  }

  public async listMFAFactors(): Promise<ListMFAFactosParams> {
    return {
      data: {
        list: [],
        TOTP: [],
        PHONE_NUMBER: [],
      },
      error: null,
    };
  }
}
