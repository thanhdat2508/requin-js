import AdminAuthAPI from "./api/admin/auth-api";
import MfaAuthAPI from "./api/mfa";
import { DEFAULT_OPTIONS } from "./constants/options";
import { RequinAuthJSOptions } from "./types/type";

export class AuthJSClient {
  /**
   * Only use in trustable server environments.
   * Cannot be used in client-side projects. (For Security Reasons)
   */
  adminAuth: AdminAuthAPI;

  /**
   * Can be used in both client-side and server-side projects.
   * MFA authentication
   */
  mfa: MfaAuthAPI;

  constructor(options: RequinAuthJSOptions) {
    const settings = { ...DEFAULT_OPTIONS, ...options };

    this.adminAuth = new AdminAuthAPI({
      url: settings.url,
      headers: settings.headers,
      fetch: settings.fetch,
    });
    this.mfa = new MfaAuthAPI();
  }
}
