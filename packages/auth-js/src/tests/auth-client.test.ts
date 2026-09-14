import { describe, expect, it, vi } from "vitest";
import AuthClientJS from "../api/admin/auth-client";
import { Session } from "../types/session";

describe("AuthClientJS Session Management", () => {
  const mockOptions = {
    url: "https://test.requin.tech",
    headers: { "x-custom": "test" },
    fetch: vi.fn(),
  };

  it("returns null session when no session is set", async () => {
    const client = new AuthClientJS(mockOptions);
    const result = await client.getSession();

    expect(result.data.session).toBeNull();
    expect(result.error).toBeNull();
  });

  it("returns active session when session is not expired", async () => {
    const client = new AuthClientJS(mockOptions);
    const mockSession: Session = {
      access_token: "active_token",
      refresh_token: "refresh_token_123",
      expires_at: Math.floor(Date.now() / 1000) + 3600, // 1 hour in future
      token_type: "bearer",
      user: {
        id: "user-1",
        email: "test@example.com",
        role: "authenticated",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    };

    client.setSession(mockSession);

    const result = await client.getSession();
    expect(result.data.session).toEqual(mockSession);
    expect(result.error).toBeNull();
  });

  it("refreshes token when session is expired", async () => {
    const refreshedSession: Session = {
      access_token: "new_access_token",
      refresh_token: "new_refresh_token",
      expires_at: Math.floor(Date.now() / 1000) + 3600,
      token_type: "bearer",
      user: {
        id: "user-1",
        email: "test@example.com",
        role: "authenticated",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    };

    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        access_token: refreshedSession.access_token,
        refresh_token: refreshedSession.refresh_token,
        expires_in: 3600,
        expires_at: refreshedSession.expires_at,
        token_type: "bearer",
        user: refreshedSession.user,
      }),
      headers: new Headers(),
    });

    const client = new AuthClientJS({
      ...mockOptions,
      fetch: mockFetch as any,
    });

    const expiredSession: Session = {
      access_token: "expired_token",
      refresh_token: "old_refresh_token",
      expires_at: Math.floor(Date.now() / 1000) - 10, // expired 10s ago
      token_type: "bearer",
      user: {
        id: "user-1",
        email: "test@example.com",
        role: "authenticated",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    };

    client.setSession(expiredSession);

    const result = await client.getSession();
    expect(result.data.session?.access_token).toBe("new_access_token");
    expect(result.data.session?.refresh_token).toBe("new_refresh_token");
    expect(result.error).toBeNull();
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it("coalesces concurrent refresh calls into a single network request", async () => {
    const refreshedSession = {
      access_token: "single_refresh_token",
      refresh_token: "next_refresh_token",
      expires_in: 3600,
      user: {
        id: "user-1",
        email: "test@example.com",
        created_at: new Date().toISOString(),
      },
    };

    const mockFetch = vi.fn().mockImplementation(
      () =>
        new Promise((resolve) =>
          setTimeout(
            () =>
              resolve({
                ok: true,
                status: 200,
                json: async () => refreshedSession,
                headers: new Headers(),
              }),
            50,
          ),
        ),
    );

    const client = new AuthClientJS({
      ...mockOptions,
      fetch: mockFetch as any,
    });

    const [res1, res2, res3] = await Promise.all([
      client.refreshSession("token_to_refresh"),
      client.refreshSession("token_to_refresh"),
      client.refreshSession("token_to_refresh"),
    ]);

    expect(mockFetch).toHaveBeenCalledTimes(1);
    expect(res1.data?.access_token).toBe("single_refresh_token");
    expect(res2.data?.access_token).toBe("single_refresh_token");
    expect(res3.data?.access_token).toBe("single_refresh_token");
  });
});
