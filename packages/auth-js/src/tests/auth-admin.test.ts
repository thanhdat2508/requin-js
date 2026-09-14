import { describe, expect, it, vi } from "vitest";
import AdminAuthAPI from "../api/admin/auth-api";

describe("AdminAuthAPI (GoTrueAdmin equivalent)", () => {
  const mockUser = {
    id: "usr_123",
    email: "admin_test@example.com",
    role: "authenticated",
    created_at: new Date().toISOString(),
  };

  it("lists users with pagination", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        users: [mockUser],
        total: 1,
        nextPage: null,
        lastPage: 1,
      }),
      headers: new Headers(),
    });

    const admin = new AdminAuthAPI({
      url: "https://test.requin.tech",
      fetch: mockFetch as any,
    });

    const result = await admin.listUsers({ page: 1, perPage: 10 });
    expect(result.data?.users).toHaveLength(1);
    expect(result.data?.users[0].id).toBe("usr_123");
    expect(result.data?.total).toBe(1);
    expect(result.error).toBeNull();
  });

  it("gets a user by ID", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        user: mockUser,
      }),
      headers: new Headers(),
    });

    const admin = new AdminAuthAPI({
      url: "https://test.requin.tech",
      fetch: mockFetch as any,
    });

    const result = await admin.getUserById("usr_123");
    expect(result.data?.user.id).toBe("usr_123");
    expect(result.data?.user.email).toBe("admin_test@example.com");
    expect(result.error).toBeNull();
  });

  it("creates a user directly as admin", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 201,
      json: async () => ({
        user: { ...mockUser, email: "new_created@example.com" },
      }),
      headers: new Headers(),
    });

    const admin = new AdminAuthAPI({
      url: "https://test.requin.tech",
      fetch: mockFetch as any,
    });

    const result = await admin.createUser({
      email: "new_created@example.com",
      password: "strong_password",
      email_confirm: true,
    });

    expect(result.data?.user.email).toBe("new_created@example.com");
    expect(result.error).toBeNull();
  });

  it("updates a user by ID", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        user: { ...mockUser, email: "updated_email@example.com" },
      }),
      headers: new Headers(),
    });

    const admin = new AdminAuthAPI({
      url: "https://test.requin.tech",
      fetch: mockFetch as any,
    });

    const result = await admin.updateUserById("usr_123", {
      email: "updated_email@example.com",
    });

    expect(result.data?.user.email).toBe("updated_email@example.com");
    expect(result.error).toBeNull();
  });

  it("deletes a user", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        user: mockUser,
      }),
      headers: new Headers(),
    });

    const admin = new AdminAuthAPI({
      url: "https://test.requin.tech",
      fetch: mockFetch as any,
    });

    const result = await admin.deleteUser("usr_123");
    expect(result.data?.user?.id).toBe("usr_123");
    expect(result.error).toBeNull();
  });

  it("manages MFA factors for a user", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        factors: [
          {
            id: "factor_1",
            name: "My TOTP",
            factor_type: "TOTP",
            status: "VERIFIED",
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
        ],
      }),
      headers: new Headers(),
    });

    const admin = new AdminAuthAPI({
      url: "https://test.requin.tech",
      fetch: mockFetch as any,
    });

    const listResult = await admin.mfa.listFactors({ userId: "usr_123" });
    expect(listResult.data?.factors).toHaveLength(1);
    expect(listResult.data?.factors[0].id).toBe("factor_1");
  });
});
