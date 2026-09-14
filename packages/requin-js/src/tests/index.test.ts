import { describe, expect, it, vi, beforeEach } from "vitest";
import { createClient, RequinClient } from "../index";

describe("RequinClient - Project Connection Module", () => {
  const mockUrl = "https://my-app.coffup.tech";
  const mockKey = "rq_production_testSecretKey123456789";

  it("fails if API key is missing", () => {
    expect(() => createClient(mockUrl, "")).toThrow(
      "Missing Requin API Key",
    );
  });

  it("fails if URL is invalid", () => {
    expect(() => createClient("not-a-valid-url", mockKey)).toThrow(
      "Invalid RequinCloudURL",
    );
  });

  it("initializes RequinClient successfully", () => {
    const client = createClient(mockUrl, mockKey);
    expect(client).toBeInstanceOf(RequinClient);
    expect(client.auth).toBeDefined();
    expect(client.rest).toBeDefined();
    expect(client.functions).toBeDefined();
    expect(typeof client.from).toBe("function");
    expect(typeof client.rpc).toBe("function");
    expect(typeof client.schema).toBe("function");
  });

  describe("Database Queries (PostgREST integration)", () => {
    it("delegates from() to rest client and attaches headers", async () => {
      let interceptedUrl = "";
      let interceptedHeaders: Record<string, string> = {};

      const mockFetch = vi.fn(async (url: any, init: any) => {
        interceptedUrl = url.toString();
        const headers = init.headers;
        if (headers instanceof Headers) {
          headers.forEach((v, k) => {
            interceptedHeaders[k] = v;
          });
        } else if (headers) {
          interceptedHeaders = { ...headers };
        }

        return new Response(JSON.stringify([{ id: "1", name: "Project Alpha" }]), {
          status: 200,
          headers: {
            "Content-Type": "application/json",
            "Content-Range": "0-0/1",
          },
        });
      });

      const client = createClient(mockUrl, mockKey, {
        global: { fetch: mockFetch as any },
      });

      const { data, error } = await client
        .from("projects")
        .select("id, name")
        .eq("name", "Project Alpha");

      expect(error).toBeNull();
      expect(data).toEqual([{ id: "1", name: "Project Alpha" }]);
      expect(interceptedUrl).toContain("/rest/v1/projects");
      expect(interceptedUrl).toContain("select=id%2Cname");
      expect(interceptedUrl).toContain("name=eq.Project+Alpha");
      expect(interceptedHeaders["apikey"]).toBe(mockKey);
      expect(interceptedHeaders["authorization"]).toBe(`Bearer ${mockKey}`);
    });

    it("supports rpc() calls", async () => {
      let interceptedUrl = "";
      let interceptedMethod = "";
      let interceptedBody = "";

      const mockFetch = vi.fn(async (url: any, init: any) => {
        interceptedUrl = url.toString();
        interceptedMethod = init.method;
        interceptedBody = init.body;

        return new Response(JSON.stringify(42), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      });

      const client = createClient(mockUrl, mockKey, {
        global: { fetch: mockFetch as any },
      });

      const { data } = await client.rpc("calculate_metrics", { factor: 2 });

      expect(data).toBe(42);
      expect(interceptedUrl).toContain("/rest/v1/rpc/calculate_metrics");
      expect(interceptedMethod).toBe("POST");
      expect(JSON.parse(interceptedBody)).toEqual({ factor: 2 });
    });

    it("supports switching database schemas via schema()", async () => {
      let interceptedHeaders: Record<string, string> = {};

      const mockFetch = vi.fn(async (url: any, init: any) => {
        const headers = init.headers;
        if (headers instanceof Headers) {
          headers.forEach((v, k) => {
            interceptedHeaders[k] = v;
          });
        }
        return new Response(JSON.stringify([]), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      });

      const client = createClient(mockUrl, mockKey, {
        global: { fetch: mockFetch as any },
      });

      await client.schema("analytics").from("events").select("*");

      expect(
        interceptedHeaders["accept-profile"] || interceptedHeaders["profile"],
      ).toBe("analytics");
    });
  });

  describe("Functions Client (Edge Functions)", () => {
    it("invokes serverless functions with parameters and auth headers", async () => {
      let interceptedUrl = "";
      let interceptedMethod = "";
      let interceptedBody = "";
      let interceptedHeaders: Record<string, string> = {};

      const mockFetch = vi.fn(async (url: any, init: any) => {
        interceptedUrl = url.toString();
        interceptedMethod = init.method;
        interceptedBody = init.body;
        const headers = init.headers;
        if (headers instanceof Headers) {
          headers.forEach((v, k) => {
            interceptedHeaders[k] = v;
          });
        }

        return new Response(JSON.stringify({ result: "processed", ok: true }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      });

      const client = createClient(mockUrl, mockKey, {
        global: { fetch: mockFetch as any },
      });

      const { data, error } = await client.functions.invoke("stripe-webhook", {
        body: { event: "payment_intent.succeeded", amount: 1000 },
      });

      expect(error).toBeNull();
      expect(data).toEqual({ result: "processed", ok: true });
      expect(interceptedUrl).toBe(`${mockUrl}/functions/v1/stripe-webhook`);
      expect(interceptedMethod).toBe("POST");
      expect(JSON.parse(interceptedBody)).toEqual({
        event: "payment_intent.succeeded",
        amount: 1000,
      });
      expect(interceptedHeaders["apikey"]).toBe(mockKey);
      expect(interceptedHeaders["authorization"]).toBe(`Bearer ${mockKey}`);
    });

    it("handles function HTTP errors gracefully", async () => {
      const mockFetch = vi.fn(async () => {
        return new Response(
          JSON.stringify({ error: "Unauthorized function access" }),
          {
            status: 403,
            headers: { "Content-Type": "application/json" },
          },
        );
      });

      const client = createClient(mockUrl, mockKey, {
        global: { fetch: mockFetch as any },
      });

      const { data, error } = await client.functions.invoke("protected-fn");
      expect(data).toBeNull();
      expect(error).toBeDefined();
      expect(error?.message).toContain("Unauthorized function access");
    });
  });

  describe("Dynamic Authorization Token Synchronization", () => {
    it("automatically propagates user access_token to Database and Functions after login", async () => {
      const userAccessToken = "user_jwt_token_abc123";
      let lastInterceptedAuthHeader = "";

      const mockFetch = vi.fn(async (url: any, init: any) => {
        const urlStr = url.toString();

        const headers = init?.headers;
        if (headers instanceof Headers) {
          lastInterceptedAuthHeader = headers.get("authorization") || "";
        } else if (headers) {
          lastInterceptedAuthHeader = headers["authorization"] || headers["Authorization"] || "";
        }

        // 1. Handle login request
        if (urlStr.includes("/auth/v1/token")) {
          return new Response(
            JSON.stringify({
              access_token: userAccessToken,
              refresh_token: "refresh_xyz789",
              expires_in: 3600,
              token_type: "bearer",
              user: { id: "user_001", email: "alice@coffup.tech" },
            }),
            {
              status: 200,
              headers: { "Content-Type": "application/json" },
            },
          );
        }

        // 2. Default data response
        return new Response(JSON.stringify([{ id: "1" }]), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      });

      const client = createClient(mockUrl, mockKey, {
        global: { fetch: mockFetch as any },
      });

      // Initially, unauthenticated requests use the project's API Key
      await client.from("todos").select("*");
      expect(lastInterceptedAuthHeader).toBe(`Bearer ${mockKey}`);

      // User signs in
      const { data: authData, error: authError } =
        await client.auth.signInWithPassword({
          email: "alice@coffup.tech",
          password: "password123",
        });

      expect(authError).toBeNull();
      expect(authData.session?.access_token).toBe(userAccessToken);

      // Subsequent database request automatically carries the user's JWT
      await client.from("todos").select("*");
      expect(lastInterceptedAuthHeader).toBe(`Bearer ${userAccessToken}`);

      // Edge functions request also automatically carries the user's JWT
      await client.functions.invoke("my-function");
      expect(lastInterceptedAuthHeader).toBe(`Bearer ${userAccessToken}`);

      // When user signs out, subsequent requests revert to API Key
      await client.auth.signOut();
      await client.from("todos").select("*");
      expect(lastInterceptedAuthHeader).toBe(`Bearer ${mockKey}`);
    });

    it("notifies listeners on auth state change", async () => {
      const client = createClient(mockUrl, mockKey);
      const events: string[] = [];

      const {
        data: { subscription },
      } = client.auth.onAuthStateChange((event) => {
        events.push(event);
      });

      client.auth.setSession({
        access_token: "token_1",
        refresh_token: "refresh_1",
        token_type: "bearer",
        user: { id: "user_1" } as any,
      });

      client.auth.setSession(null);

      expect(events).toEqual(["SIGNED_IN", "SIGNED_OUT"]);

      subscription.unsubscribe();
      client.auth.setSession({
        access_token: "token_2",
        refresh_token: "refresh_2",
        token_type: "bearer",
        user: { id: "user_2" } as any,
      });

      // No more events received after unsubscribe
      expect(events.length).toBe(2);
    });
  });
});
