import { createClient } from "@requin/requin-js";

// Mock fetch để demo luồng User Auth và Admin Auth
const mockFetch = async (url: string | URL, options?: any) => {
  const urlStr = url.toString();
  const method = options?.method || "GET";
  console.log(`📡 [Network Request] ${method} -> ${urlStr}`);

  // 1. API Refresh Token
  if (urlStr.includes("/token?type=refresh_token")) {
    return {
      ok: true,
      status: 200,
      headers: new Headers(),
      json: async () => ({
        access_token: "access_token_renewed_xyz789",
        refresh_token: "refresh_token_renewed_abc456",
        expires_in: 3600,
        token_type: "bearer",
        user: {
          id: "usr_001",
          email: "user@coffup.tech",
          role: "authenticated",
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      }),
    };
  }

  // 2. Admin API: MFA List Factors
  if (urlStr.includes("/factors") && method === "GET") {
    return {
      ok: true,
      status: 200,
      headers: new Headers(),
      json: async () => ({
        factors: [
          {
            id: "factor_totp_1",
            name: "Google Authenticator",
            factor_type: "TOTP",
            status: "VERIFIED",
            createdAt: "2026-08-10T00:00:00Z",
            updatedAt: "2026-08-10T00:00:00Z",
          },
        ],
      }),
    };
  }

  // 3. Admin API: List Users (GET /admin/users)
  if (
    urlStr.includes("/admin/users") &&
    method === "GET" &&
    !urlStr.match(/\/admin\/users\/[^?]+/)
  ) {
    return {
      ok: true,
      status: 200,
      headers: new Headers(),
      json: async () => ({
        users: [
          {
            id: "usr_001",
            email: "alice@coffup.tech",
            role: "authenticated",
            created_at: "2026-08-01T10:00:00Z",
          },
          {
            id: "usr_002",
            email: "bob@coffup.tech",
            role: "authenticated",
            created_at: "2026-08-15T14:30:00Z",
          },
        ],
        total: 2,
        nextPage: null,
        lastPage: 1,
      }),
    };
  }

  // 4. Admin API: Get User By ID (GET /admin/users/:id)
  if (urlStr.match(/\/admin\/users\/usr_[^/]+$/) && method === "GET") {
    return {
      ok: true,
      status: 200,
      headers: new Headers(),
      json: async () => ({
        user: {
          id: "usr_001",
          email: "alice@coffup.tech",
          role: "authenticated",
          created_at: "2026-08-01T10:00:00Z",
        },
      }),
    };
  }

  // 5. Admin API: Create User (POST /admin/users)
  if (urlStr.endsWith("/admin/users") && method === "POST") {
    const body = JSON.parse(options?.body || "{}");
    console.log("   📦 Admin tạo user với body:", body);

    return {
      ok: true,
      status: 201,
      headers: new Headers(),
      json: async () => ({
        user: {
          id: "usr_003",
          email: body.email,
          role: "authenticated",
          created_at: new Date().toISOString(),
        },
      }),
    };
  }

  // 6. Admin API: Update User By ID (PUT /admin/users/:id)
  if (urlStr.includes("/admin/users/usr_001") && method === "PUT") {
    const body = JSON.parse(options?.body || "{}");
    console.log("   📦 Admin cập nhật user:", body);

    return {
      ok: true,
      status: 200,
      headers: new Headers(),
      json: async () => ({
        user: {
          id: "usr_001",
          email: body.email || "alice_updated@coffup.tech",
          role: "authenticated",
          updated_at: new Date().toISOString(),
        },
      }),
    };
  }

  // 7. Admin API: Delete User (DELETE /admin/users/:id)
  if (urlStr.includes("/admin/users/") && method === "DELETE") {
    return {
      ok: true,
      status: 200,
      headers: new Headers(),
      json: async () => ({
        user: {
          id: "usr_003",
          email: "charlie@coffup.tech",
        },
      }),
    };
  }

  return {
    ok: true,
    status: 200,
    headers: new Headers(),
    json: async () => ({}),
  };
};

async function runDemo() {
  console.log(
    "=================================================================",
  );
  console.log(
    "   🚀 DEMO REQUIN-JS: CLIENT AUTH & ADMIN AUTH (GOTRUE ADMIN)    ",
  );
  console.log(
    "=================================================================\n",
  );

  // Khởi tạo client với service role key
  const client = createClient(
    "https://cloud.requin.tech/vvbqlrkdtgjvaxwwkbst",
    "rq_production_0Ckic-EJd0OFxpCGEOExw_UBLzR7Kb",
    {
      global: {
        fetch: mockFetch as any,
      },
    },
  );

  console.log(
    "-----------------------------------------------------------------",
  );
  console.log("📌 PHẦN I: CLIENT AUTH (Người dùng tự quản lý phiên đăng nhập)");
  console.log(
    "-----------------------------------------------------------------",
  );

  // 1. Session ban đầu
  const initialSession = await client.auth.getSession();
  console.log("1. Session ban đầu:", initialSession.data.session);

  // 2. Set session còn hạn
  client.auth.setSession({
    access_token: "token_123",
    refresh_token: "refresh_456",
    expires_at: Math.floor(Date.now() / 1000) + 3600,
    token_type: "bearer",
    user: {
      id: "usr_001",
      email: "alice@coffup.tech",
      created_at: new Date().toISOString(),
    },
  });
  const activeSession = await client.auth.getSession();
  console.log(
    "2. Đã set session cho User:",
    activeSession.data.session?.user?.email,
  );

  // 3. Tự động refresh khi hết hạn
  client.auth.setSession({
    access_token: "expired_token",
    refresh_token: "refresh_456",
    expires_at: Math.floor(Date.now() / 1000) - 10,
    token_type: "bearer",
    user: {
      id: "usr_001",
      email: "alice@coffup.tech",
      created_at: new Date().toISOString(),
    },
  });
  const refreshed = await client.auth.getSession();

  console.log(
    "3. Tự động refresh token mới:",
    refreshed.data.session?.access_token,
  );

  console.log(
    "\n-----------------------------------------------------------------",
  );
  console.log(
    "👑 PHẦN II: ADMIN AUTH (Quyền quản trị Server-side / GoTrueAdmin)",
  );
  console.log(
    "-----------------------------------------------------------------\n",
  );

  // 1. Admin lấy danh sách toàn bộ Users
  console.log(
    "▶ [ADMIN] 1. Lấy danh sách users (client.auth.admin.listUsers())",
  );
  const listUsersRes = await client.auth.admin.listUsers({
    page: 1,
    perPage: 10,
  });
  console.log("   • Tổng số users :", listUsersRes.data?.total);
  listUsersRes.data?.users.forEach((u) => {
    console.log(`   • User [${u.id}]: ${u.email} (Ngày tạo: ${u.created_at})`);
  });
  console.log("");

  // 2. Admin lấy chi tiết 1 User qua ID
  console.log(
    "▶ [ADMIN] 2. Lấy thông tin user qua ID (client.auth.admin.getUserById())",
  );
  const userDetail = await client.auth.admin.getUserById("usr_001");
  console.log("   • Tìm thấy user :", userDetail.data?.user.email);
  console.log("");

  // 3. Admin tạo User mới trực tiếp (bỏ qua email verification)
  console.log(
    "▶ [ADMIN] 3. Tạo user mới trực tiếp (client.auth.admin.createUser())",
  );
  const newUser = await client.auth.admin.createUser({
    email: "charlie@coffup.tech",
    password: "secure_password_123",
    email_confirm: true,
    user_metadata: { full_name: "Charlie Chaplin", department: "Engineering" },
  });

  console.log(
    "   • User mới tạo  :",
    newUser.data?.user.email,
    "ID:",
    newUser.data?.user.id,
  );
  console.log("");

  // 4. Admin cập nhật thông tin User
  console.log(
    "▶ [ADMIN] 4. Cập nhật user (client.auth.admin.updateUserById())",
  );
  const updatedUser = await client.auth.admin.updateUserById("usr_001", {
    email: "alice_updated@coffup.tech",
    user_metadata: { role: "lead_dev" },
  });
  console.log("   • Email sau update:", updatedUser.data?.user.email);
  console.log("");

  // 5. Admin kiểm tra các yếu tố 2FA/MFA của User
  console.log(
    "▶ [ADMIN] 5. Kiểm tra 2FA/MFA của user (client.auth.admin.mfa.listFactors())",
  );
  const mfaRes = await client.auth.admin.mfa.listFactors({ userId: "usr_001" });
  console.log("   • Số factor 2FA :", mfaRes.data?.factors.length);
  if (mfaRes.data?.factors?.length) {
    console.log(
      "   • Chi tiết factor:",
      mfaRes.data.factors[0].name,
      `[${mfaRes.data.factors[0].factor_type}]`,
    );
  }
  console.log("");

  // 6. Admin xóa User
  console.log("▶ [ADMIN] 6. Xóa user (client.auth.admin.deleteUser())");
  const deletedRes = await client.auth.admin.deleteUser("usr_003");
  console.log("   • Đã xóa user   :", deletedRes.data?.user?.email);
  console.log("");

  console.log(
    "=================================================================",
  );
  console.log("🎉 Hoàn tất kiểm thử Client Auth & Admin Auth (GoTrueAdmin)!");
  console.log(
    "=================================================================",
  );
}

runDemo().catch((err) => {
  console.error("❌ Lỗi khi chạy demo:", err);
});
