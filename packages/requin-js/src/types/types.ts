import { Fetch, RequinAuthJS } from "@requin/auth-js";
import type {
  PostgrestError,
  PostgrestResponse,
  PostgrestSingleResponse,
  PostgrestMaybeSingleResponse,
} from "@supabase/postgrest-js";
import type {
  FunctionInvokeOptions,
  FunctionsResponse,
  FunctionsError,
} from "../lib/functions-client";

export type RequinClientSettings<SchemaName = string> = {
  /**
   * Optional database options.
   */
  db?: {
    /**
     * The schema to query from.
     * @default 'public'
     */
    schema?: SchemaName;

    /**
     * Enable or disable retry in database requests.
     */
    retry?: boolean;
  };

  /**
   * Optional auth options.
   */
  auth?: {
    /**
     * Automatically refreshes the token for logged in users.
     * @default true
     */
    autoRefreshToken?: boolean;

    /**
     * Whether to persist session.
     * @default true
     */
    persistSession?: boolean;
  };

  /**
   * Optional global options applied to all sub-clients.
   */
  global?: {
    headers?: Record<string, string>;
    fetch?: Fetch;
  };

  /**
   * Custom fetch implementation.
   */
  fetch?: Fetch;
};

export interface RequinAuthSettings extends RequinAuthJS {}

export type {
  PostgrestError,
  PostgrestResponse,
  PostgrestSingleResponse,
  PostgrestMaybeSingleResponse,
  FunctionInvokeOptions,
  FunctionsResponse,
  FunctionsError,
};
