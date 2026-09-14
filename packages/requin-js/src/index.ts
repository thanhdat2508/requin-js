import { RequinClientSettings } from "./types/types";
import RequinClient from "./client";

export const createClient = <
  Database = any,
  SchemaName extends string & keyof Database = "public" extends keyof Database
    ? "public"
    : string & keyof Database,
>(
  requinUrl: string,
  requinKey: string,
  options?: RequinClientSettings<SchemaName>,
): RequinClient<Database, SchemaName> => {
  return new RequinClient<Database, SchemaName>(requinUrl, requinKey, options);
};

export { default as RequinClient } from "./client";
export {
  RequinFunctionsClient,
  FunctionsError,
  FunctionsFetchError,
  FunctionsHttpError,
  FunctionsRelayError,
} from "./lib/functions-client";
export * from "./types/types";
export * from "@requin/auth-js";
export {
  PostgrestClient,
  PostgrestQueryBuilder,
  PostgrestFilterBuilder,
  PostgrestTransformBuilder,
  PostgrestBuilder,
} from "@supabase/postgrest-js";
