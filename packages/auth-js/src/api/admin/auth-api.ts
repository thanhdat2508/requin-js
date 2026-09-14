import { REQUEST_METHOD } from "../../constants/method";
import { AuthError, isAuthError } from "../../error/auth-error";
import { request } from "../../lib/fetch";
import { resolveFetch } from "../../lib/helper";
import { Fetch } from "../../types/fetch";
import {
  AdminDeleteUserResponse,
  AdminListUsersParams,
  AdminListUsersResponse,
  AdminUserAttributes,
  AdminUserResponse,
  DeleteUserFactorResponse,
  DeleteUserFactors,
  GenerateLinkParams,
  GenerateLinkResponse,
  MfaAdminAuthAPI,
  UserFactorsParams,
  UserListFactorsResponse,
} from "../../types/type";

/**
 * Only use in trustable server-side environments.
 * This can not be worked in client-side projects for some security reasons.
 *
 * This will allow you full access to Requin Service and Database with no limit permission of normal user.
 *
 * Use this if you want full access to Requin Service and Database.
 *
 * Create ADMIN client for manage and see list of users
 *
 * @example Using requin-js (recommended)
 * ```ts
 *  import { createClient } from '@requin/requin-js'
 *
 *  const client = createClient('https://organization_url.coffup.tech', 'your_service_role_key')
 *  const { data, error } = await client.auth.admin.listUsers() // Get users list
 * ```
 */
export default class AdminAuthAPI {
  public mfa: MfaAdminAuthAPI;

  protected fetch: Fetch;
  protected headers: Record<string, string> = {};
  protected url: string;

  constructor({
    url = "",
    headers = {},
    fetch,
  }: {
    url: string;
    headers?: {
      [key: string]: string;
    };
    fetch?: Fetch;
  }) {
    this.headers = headers;
    this.url = url;
    this.fetch = resolveFetch(fetch);

    this.mfa = {
      listFactors: async (
        params: UserFactorsParams,
      ): Promise<UserListFactorsResponse> => {
        try {
          return await request(
            this.fetch,
            REQUEST_METHOD.GET,
            `${this.url}/admin/users/${params.userId}/factors`,
            {
              headers: this.headers,
              responseFormat: (data: any) => ({
                data: {
                  factors: Array.isArray(data) ? data : (data.factors ?? []),
                },
                error: null,
              }),
            },
          );
        } catch (error) {
          return {
            data: null,
            error: isAuthError(error)
              ? error
              : new AuthError((error as Error)?.message ?? "Unknown error"),
          };
        }
      },
      deleteFactor: async (
        params: DeleteUserFactors,
      ): Promise<DeleteUserFactorResponse> => {
        try {
          return await request(
            this.fetch,
            REQUEST_METHOD.DELETE,
            `${this.url}/admin/users/${params.userId}/factors/${params.factorId}`,
            {
              headers: this.headers,
              responseFormat: (data: any) => ({
                data: {
                  id: params.factorId,
                  ...(data || {}),
                },
                error: null,
              }),
            },
          );
        } catch (error) {
          return {
            data: null,
            error: isAuthError(error)
              ? error
              : new AuthError((error as Error)?.message ?? "Unknown error"),
          };
        }
      },
    };
  }

  /**
   * Get a list of users in the system.
   *
   * @param params Pagination options (page, perPage)
   */
  public async listUsers(
    params?: AdminListUsersParams,
  ): Promise<AdminListUsersResponse> {
    try {
      const query: Record<string, string> = {};
      if (params?.page) query.page = params.page.toString();
      if (params?.perPage) query.per_page = params.perPage.toString();

      return await request(
        this.fetch,
        REQUEST_METHOD.GET,
        `${this.url}/admin/users`,
        {
          headers: this.headers,
          query,
          responseFormat: (data: any) => ({
            data: {
              users: Array.isArray(data) ? data : (data.users ?? []),
              total: data.total ?? (Array.isArray(data) ? data.length : 0),
              nextPage: data.nextPage ?? null,
              lastPage:
                data.lastPage ??
                (data.total && params?.perPage
                  ? Math.ceil(data.total / params.perPage)
                  : 1),
            },
            error: null,
          }),
        },
      );
    } catch (error) {
      return {
        data: null,
        error: isAuthError(error)
          ? error
          : new AuthError((error as Error)?.message ?? "Unknown error"),
      };
    }
  }

  /**
   * Get a user's details by user ID.
   *
   * @param uid The user's ID
   */
  public async getUserById(uid: string): Promise<AdminUserResponse> {
    try {
      return await request(
        this.fetch,
        REQUEST_METHOD.GET,
        `${this.url}/admin/users/${uid}`,
        {
          headers: this.headers,
          responseFormat: (data: any) => ({
            data: {
              user: data.user ?? data,
            },
            error: null,
          }),
        },
      );
    } catch (error) {
      return {
        data: null,
        error: isAuthError(error)
          ? error
          : new AuthError((error as Error)?.message ?? "Unknown error"),
      };
    }
  }

  /**
   * Create a new user with admin privileges (bypassing normal verification).
   *
   * @param attributes User attributes (email, password, metadata, etc.)
   */
  public async createUser(
    attributes: AdminUserAttributes,
  ): Promise<AdminUserResponse> {
    try {
      return await request(
        this.fetch,
        REQUEST_METHOD.POST,
        `${this.url}/admin/users`,
        {
          headers: this.headers,
          body: attributes,
          responseFormat: (data: any) => ({
            data: {
              user: data.user ?? data,
            },
            error: null,
          }),
        },
      );
    } catch (error) {
      return {
        data: null,
        error: isAuthError(error)
          ? error
          : new AuthError((error as Error)?.message ?? "Unknown error"),
      };
    }
  }

  /**
   * Update a user's attributes (email, password, metadata, ban duration, etc.) by user ID.
   *
   * @param uid The user's ID
   * @param attributes Updated user attributes
   */
  public async updateUserById(
    uid: string,
    attributes: AdminUserAttributes,
  ): Promise<AdminUserResponse> {
    try {
      return await request(
        this.fetch,
        REQUEST_METHOD.PUT,
        `${this.url}/admin/users/${uid}`,
        {
          headers: this.headers,
          body: attributes,
          responseFormat: (data: any) => ({
            data: {
              user: data.user ?? data,
            },
            error: null,
          }),
        },
      );
    } catch (error) {
      return {
        data: null,
        error: isAuthError(error)
          ? error
          : new AuthError((error as Error)?.message ?? "Unknown error"),
      };
    }
  }

  /**
   * Delete a user by user ID.
   *
   * @param uid The user's ID
   * @param shouldSoftDelete If true, marks user as soft-deleted instead of permanently deleted
   */
  public async deleteUser(
    uid: string,
    shouldSoftDelete?: boolean,
  ): Promise<AdminDeleteUserResponse> {
    try {
      return await request(
        this.fetch,
        REQUEST_METHOD.DELETE,
        `${this.url}/admin/users/${uid}`,
        {
          headers: this.headers,
          body: { should_soft_delete: shouldSoftDelete },
          responseFormat: (data: any) => ({
            data: {
              user: data.user ?? data ?? null,
            },
            error: null,
          }),
        },
      );
    } catch (error) {
      return {
        data: null,
        error: isAuthError(error)
          ? error
          : new AuthError((error as Error)?.message ?? "Unknown error"),
      };
    }
  }

  /**
   * Sends an invite link to an email.
   *
   * @param email The user email
   * @param options Additional metadata or redirect URL
   */
  public async inviteUserByEmail(
    email: string,
    options?: { data?: Record<string, any>; redirectTo?: string },
  ): Promise<AdminUserResponse> {
    try {
      return await request(
        this.fetch,
        REQUEST_METHOD.POST,
        `${this.url}/invite`,
        {
          headers: this.headers,
          body: { email, data: options?.data },
          redirectTo: options?.redirectTo,
          responseFormat: (data: any) => ({
            data: {
              user: data.user ?? data,
            },
            error: null,
          }),
        },
      );
    } catch (error) {
      return {
        data: null,
        error: isAuthError(error)
          ? error
          : new AuthError((error as Error)?.message ?? "Unknown error"),
      };
    }
  }

  /**
   * Generates email action links (e.g. signup, recovery, magiclink, invite).
   *
   * @param params Link generation parameters
   */
  public async generateLink(
    params: GenerateLinkParams,
  ): Promise<GenerateLinkResponse> {
    try {
      return await request(
        this.fetch,
        REQUEST_METHOD.POST,
        `${this.url}/admin/generate_link`,
        {
          headers: this.headers,
          body: params,
          redirectTo: params.redirectTo,
          responseFormat: (data: any) => ({
            data,
            error: null,
          }),
        },
      );
    } catch (error) {
      return {
        data: null,
        error: isAuthError(error)
          ? error
          : new AuthError((error as Error)?.message ?? "Unknown error"),
      };
    }
  }
}
