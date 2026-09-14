import {
  FactorStatusType,
  FactorListType,
  FACTOR_LIST,
  FACTOR_STATUS,
} from "../constants/factor";
import { Fetch } from "./fetch";
import { RequestResult } from "./request";
import { Session } from "./session";
import { User } from "../lib/types";

export type RequinAuthJS = {
  /**
   * URL of Auth server
   */
  url?: string;

  headers?: { [key: string]: string };

  /**
   * Automatically refreshes the token for logged in users.
   *
   * @default true
   */
  autoRefreshToken?: boolean;

  /**
   * Requin fetcher function
   * Custom for fetch data
   */
  fetch?: Fetch;
};

export interface RequinAuthJSOptions extends RequinAuthJS {}

export type Factor<
  Type extends FactorListType = FactorListType,
  Status extends FactorStatusType = FactorStatusType,
> = {
  /**
   * ID of the factor
   */
  id: string;

  /**
   * Name of the factor
   */
  name: string;

  /**
   * Type of the factor
   */
  factor_type: Type;

  /**
   * Status of the factor
   * @default `UN_VERIFIED`
   *
   * User need to verify the factor to make it active and change status to `VERIFIED`
   */
  status: Status;

  createdAt: string;
  updatedAt: string;

  /**
   * Time when the factor was verified
   */
  lastVerifiedAt?: string;
};

export type UserFactorsParams = {
  userId: string;
};

export type DeleteUserFactors = {
  /**
   * ID of the user
   */
  userId: string;

  /**
   * ID of the factor
   */
  factorId: string;
};

export type UserListFactorsResponse = RequestResult<{
  factors: Factor[];
}>;

export type DeleteUserFactorResponse = RequestResult<{
  id: string;
}>;

export type RefreshTokenResponse = RequestResult<Session>;

export type ListMFAFactosParams<T extends FactorListType = FactorListType> =
  RequestResult<
    {
      list: Factor[];
    } & {
      // Custom type for each factor
      // Only apply for verified factors
      [K in T]: Factor<K, FACTOR_STATUS.VERIFIED>[];
    }
  >;

export interface MfaAdminAuthAPI {
  /**
   * List all factors for a user.
   */
  listFactors(params: UserFactorsParams): Promise<UserListFactorsResponse>;

  /**
   * Delete a factor for a user.
   */
  deleteFactor(params: DeleteUserFactors): Promise<DeleteUserFactorResponse>;
}

export type AdminUserAttributes = {
  email?: string;
  phone?: string;
  password?: string;
  email_confirm?: boolean;
  phone_confirm?: boolean;
  user_metadata?: Record<string, any>;
  app_metadata?: Record<string, any>;
  ban_duration?: string;
  role?: string;
};

export type AdminListUsersParams = {
  page?: number;
  perPage?: number;
};

export type AdminListUsersResponse = RequestResult<{
  users: User[];
  total?: number;
  nextPage?: number | null;
  lastPage?: number;
}>;

export type AdminUserResponse = RequestResult<{
  user: User;
}>;

export type AdminDeleteUserResponse = RequestResult<{
  user: User | null;
}>;

export type GenerateLinkParams = {
  type:
    | "signup"
    | "invite"
    | "magiclink"
    | "recovery"
    | "email_change_current"
    | "email_change_new";
  email: string;
  password?: string;
  data?: Record<string, any>;
  redirectTo?: string;
};

export type GenerateLinkResponse = RequestResult<{
  properties: {
    action_link: string;
    email_otp: string;
    hashed_token: string;
    redirect_to?: string;
    verification_type: string;
  };
  user: User;
}>;

export type SignUpWithPasswordCredentials = {
  email: string;
  password: string;
  options?: {
    data?: Record<string, any>;
    emailRedirectTo?: string;
  };
};

export type SignInWithPasswordCredentials = {
  email: string;
  password: string;
};

export type AuthChangeEvent =
  | 'SIGNED_IN'
  | 'SIGNED_OUT'
  | 'TOKEN_REFRESHED'
  | 'USER_UPDATED'
  | 'INITIAL_SESSION';

export type AuthStateChangeCallback = (
  event: AuthChangeEvent,
  session: Session | null,
) => void | Promise<void>;

export type AuthSubscription = {
  id: string;
  callback: AuthStateChangeCallback;
  unsubscribe: () => void;
};

export type DeviceCodeParams = {
  scopes?: string[];
};

export type DeviceCodeResponse = RequestResult<{
  device_code: string;
  user_code: string;
  verification_uri: string;
  expires_in: number;
  interval: number;
}>;
