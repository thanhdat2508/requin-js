import { Fetch } from "@requin/auth-js";

export class FunctionsError extends Error {
  public readonly context?: any;

  constructor(message: string, name = "FunctionsError", context?: any) {
    super(message);
    this.name = name;
    this.context = context;
  }
}

export class FunctionsFetchError extends FunctionsError {
  constructor(context: any) {
    super(
      "Failed to send a request to the Edge Function",
      "FunctionsFetchError",
      context,
    );
  }
}

export class FunctionsHttpError extends FunctionsError {
  public readonly status: number;

  constructor(status: number, message: string, context?: any) {
    super(message, "FunctionsHttpError", context);
    this.status = status;
  }
}

export class FunctionsRelayError extends FunctionsError {
  constructor(context: any) {
    super(
      "Relay Error invoking the Edge Function",
      "FunctionsRelayError",
      context,
    );
  }
}

export interface FunctionInvokeOptions {
  /**
   * HTTP Method to invoke the function with.
   * @default 'POST'
   */
  method?: "POST" | "GET" | "PUT" | "PATCH" | "DELETE";

  /**
   * Headers to pass to the function call.
   */
  headers?: Record<string, string>;

  /**
   * The body of the request.
   */
  body?:
    | Record<string, any>
    | string
    | ArrayBuffer
    | Blob
    | FormData
    | ReadableStream
    | null;

  /**
   * Expected response data format.
   * @default 'json'
   */
  responseType?: "json" | "text" | "blob" | "arrayBuffer";
}

export type FunctionsResponse<T = any> =
  | {
      data: T;
      error: null;
    }
  | {
      data: null;
      error: FunctionsError;
    };

export class RequinFunctionsClient {
  protected url: string;
  protected headers: Record<string, string>;
  protected customFetch?: Fetch;

  constructor(options: {
    url: string;
    headers?: Record<string, string>;
    fetch?: Fetch;
  }) {
    this.url = options.url.replace(/\/+$/, "");
    this.headers = options.headers || {};
    this.customFetch = options.fetch;
  }

  /**
   * Set or update headers (e.g. for updated Authorization token).
   */
  public setHeaders(headers: Record<string, string>) {
    this.headers = {
      ...this.headers,
      ...headers,
    };
  }

  /**
   * Invokes an Edge Serverless Function.
   *
   * @param functionName Name or route of the function to invoke
   * @param options Execution parameters (method, headers, body, responseType)
   */
  public async invoke<T = any>(
    functionName: string,
    options: FunctionInvokeOptions = {},
  ): Promise<FunctionsResponse<T>> {
    try {
      const cleanName = functionName.replace(/^\/+/, "");
      const targetUrl = `${this.url}/${cleanName}`;
      const method = options.method ?? "POST";
      const responseType = options.responseType ?? "json";

      const headers: Record<string, string> = {
        ...this.headers,
        ...(options.headers || {}),
      };

      let body: any = options.body;

      if (
        body !== undefined &&
        body !== null &&
        typeof body === "object" &&
        !(body instanceof Blob) &&
        !(body instanceof ArrayBuffer) &&
        !(typeof FormData !== "undefined" && body instanceof FormData) &&
        !(typeof ReadableStream !== "undefined" && body instanceof ReadableStream)
      ) {
        body = JSON.stringify(body);
        if (!headers["Content-Type"]) {
          headers["Content-Type"] = "application/json";
        }
      }

      const fetcher = this.customFetch ?? fetch;
      const res = await fetcher(targetUrl, {
        method,
        headers,
        body: method !== "GET" ? body : undefined,
      });

      if (!res.ok) {
        let errorMsg = `Function returned status ${res.status}`;
        let errorBody: any;
        try {
          const contentType = res.headers.get("content-type");
          if (contentType && contentType.includes("application/json")) {
            errorBody = await res.json();
            errorMsg = errorBody.error || errorBody.message || errorMsg;
          } else {
            errorBody = await res.text();
            if (errorBody) errorMsg = errorBody;
          }
        } catch {
          // ignore parsing error
        }

        return {
          data: null,
          error: new FunctionsHttpError(res.status, errorMsg, errorBody),
        };
      }

      let data: any;
      if (responseType === "json") {
        data = await res.json();
      } else if (responseType === "text") {
        data = await res.text();
      } else if (responseType === "blob") {
        data = await res.blob();
      } else if (responseType === "arrayBuffer") {
        data = await res.arrayBuffer();
      } else {
        data = await res.json();
      }

      return {
        data,
        error: null,
      };
    } catch (err: any) {
      if (err instanceof FunctionsError) {
        return { data: null, error: err };
      }
      return {
        data: null,
        error: new FunctionsFetchError(err),
      };
    }
  }
}
