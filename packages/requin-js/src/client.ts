import { AuthClientJS } from "@requin/auth-js";
import { PostgrestClient } from "@supabase/postgrest-js";
import { RequinFunctionsClient } from "./lib/functions-client";
import { checkApiKeyFormat, validateRequinUrl } from "./lib/helper";
import { RequinClientSettings } from "./types/types";

export default class RequinClient<
  Database = any,
  SchemaName extends string & keyof Database = "public" extends keyof Database
    ? "public"
    : string & keyof Database,
  Schema = Database[SchemaName] extends Record<string, unknown>
    ? Database[SchemaName]
    : any,
> {
  public auth: AuthClientJS;
  public rest: PostgrestClient<Database>;
  public functions: RequinFunctionsClient;

  protected authUrl: string;
  protected restUrl: string;
  protected functionsUrl: string;
  protected defaultHeaders: Record<string, string>;

  constructor(
    protected requinUrl: string,
    protected requinKey: string,
    protected options?: RequinClientSettings<SchemaName>,
  ) {
    const baseUrl = validateRequinUrl(requinUrl);

    if (!requinKey) throw new Error("Missing Requin API Key");

    checkApiKeyFormat(requinKey);

    this.authUrl = new URL("auth/v1", baseUrl).toString();
    this.restUrl = new URL("rest/v1", baseUrl).toString();
    this.functionsUrl = new URL("functions/v1", baseUrl).toString();

    const globalHeaders = options?.global?.headers || {};
    this.defaultHeaders = {
      apikey: requinKey,
      Authorization: `Bearer ${requinKey}`,
      ...globalHeaders,
    };

    const customFetch = options?.global?.fetch ?? options?.fetch;

    // 1. Auth Client (Native BaaS authentication)
    this.auth = new AuthClientJS({
      url: this.authUrl,
      headers: this.defaultHeaders,
      autoRefreshToken: options?.auth?.autoRefreshToken ?? true,
      fetch: customFetch,
    });

    // Dynamic fetcher that injects the user's access token if logged in
    const dynamicFetch = async (
      input: string | URL | Request,
      init?: RequestInit,
    ) => {
      const userToken = this.auth.getAccessToken();
      const currentToken = userToken || this.requinKey;

      const headers = new Headers(init?.headers);
      if (!headers.has("apikey")) {
        headers.set("apikey", this.requinKey);
      }
      if (!headers.has("Authorization")) {
        headers.set("Authorization", `Bearer ${currentToken}`);
      } else {
        const existingAuth = headers.get("Authorization");
        if (existingAuth === `Bearer ${this.requinKey}` && userToken) {
          headers.set("Authorization", `Bearer ${userToken}`);
        }
      }

      for (const [key, val] of Object.entries(globalHeaders)) {
        if (!headers.has(key)) {
          headers.set(key, val);
        }
      }

      const fetcher = customFetch ?? fetch;
      return fetcher(input as any, {
        ...init,
        headers,
      });
    };

    // 2. PostgREST Database Client
    const targetSchema = (options?.db?.schema ?? "public") as any;
    this.rest = new PostgrestClient<Database>(
      this.restUrl,
      {
        headers: this.defaultHeaders,
        schema: targetSchema,
        fetch: dynamicFetch as any,
      },
    );

    // 3. Functions Client
    this.functions = new RequinFunctionsClient({
      url: this.functionsUrl,
      headers: this.defaultHeaders,
      fetch: dynamicFetch as any,
    });
  }

  /**
   * Perform a query on a database table or view.
   *
   * @param relation The name of the table or view
   */
  public from<
    TableName extends string & keyof Schema = string & keyof Schema,
  >(relation: TableName) {
    return this.rest.from(relation as any);
  }

  /**
   * Switch the target schema for subsequent queries.
   *
   * @param schema The schema name
   */
  public schema<
    CustomSchemaName extends string & keyof Database = string &
      keyof Database,
  >(schema: CustomSchemaName) {
    return this.rest.schema(schema as any);
  }

  /**
   * Call a Postgres Stored Procedure / Function via PostgREST RPC.
   *
   * @param fn The function name
   * @param args Function arguments
   * @param options Execution options (head, count)
   */
  public rpc(
    fn: string,
    args: Record<string, any> = {},
    options: {
      head?: boolean;
      count?: "exact" | "planned" | "estimated";
    } = {},
  ) {
    return this.rest.rpc(fn as any, args, options);
  }
}
