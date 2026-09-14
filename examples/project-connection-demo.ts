import { createClient } from "@requin/requin-js";

// Mock fetch to simulate Requinbase Project endpoints
const mockFetch = async (url: string | URL | Request, options?: any) => {
  const urlStr = url.toString();
  const method = options?.method || "GET";
  console.log(`📡 [HTTP Network] ${method} -> ${urlStr}`);

  // 1. Auth: User Login (POST /auth/v1/token)
  if (urlStr.includes("/auth/v1/token") && method === "POST") {
    return new Response(
      JSON.stringify({
        access_token: "jwt_usr_token_abcdef123456",
        refresh_token: "refresh_token_7890xyz",
        expires_in: 3600,
        token_type: "bearer",
        user: {
          id: "usr_uuid_101",
          email: "dev@coffup.tech",
          role: "authenticated",
          created_at: new Date().toISOString(),
        },
      }),
      { status: 200, headers: { "Content-Type": "application/json" } },
    );
  }

  // 2. Database (PostgREST): Table Select (GET /rest/v1/todos)
  if (urlStr.includes("/rest/v1/todos") && method === "GET") {
    const authHeader =
      options?.headers?.get?.("authorization") ||
      options?.headers?.["Authorization"] ||
      options?.headers?.["authorization"];
    console.log(`Auth Header nhận được: "${authHeader}"`);

    return new Response(
      JSON.stringify([
        { id: 1, title: "Xây dựng Requin JS SDK", completed: true },
        { id: 2, title: "Kết nối PostgREST & Auth", completed: true },
        { id: 3, title: "Deploy Edge Functions", completed: false },
      ]),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          "Content-Range": "0-2/3",
        },
      },
    );
  }

  // 3. Database (PostgREST): Insert (POST /rest/v1/todos)
  if (urlStr.includes("/rest/v1/todos") && method === "POST") {
    const body = JSON.parse(options?.body || "{}");
    console.log("Dữ liệu insert:", body);
    return new Response(
      JSON.stringify([
        { id: 4, ...body, created_at: new Date().toISOString() },
      ]),
      { status: 201, headers: { "Content-Type": "application/json" } },
    );
  }

  // 4. Database (PostgREST): RPC Stored Procedure (POST /rest/v1/rpc/hello_world)
  if (urlStr.includes("/rest/v1/rpc/") && method === "POST") {
    return new Response(
      JSON.stringify({ message: "Hello from Postgres RPC!" }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      },
    );
  }

  // 5. Edge Serverless Functions (POST /functions/v1/process-data)
  if (urlStr.includes("/functions/v1/process-data")) {
    const body = JSON.parse(options?.body || "{}");
    console.log("Edge Function Input:", body);
    return new Response(
      JSON.stringify({
        success: true,
        output: `Processed ${body.items?.length || 0} items in 4ms`,
      }),
      { status: 200, headers: { "Content-Type": "application/json" } },
    );
  }

  return new Response(JSON.stringify({}), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
};

async function main() {
  console.log(
    "===============================================================",
  );
  console.log(
    "  🚀 DEMO: KẾT NỐI TỚI PROJECT REQUINBASE BẰNG @requin/requin-js ",
  );
  console.log(
    "  (Hoạt động tương tự supabase-js với Client URL & API Key)     ",
  );
  console.log(
    "===============================================================\n",
  );

  // 1. Khởi tạo Client
  const projectUrl = "https://my-project.coffup.tech";
  const apiKey = "rq_production_0CkicEJd0OFxpCGEOExwUBLzR7Kb";

  console.log(`1. Khởi tạo client kết nối tới: ${projectUrl}`);
  const requin = createClient(projectUrl, apiKey, {
    db: { schema: "public" },
    global: {
      fetch: mockFetch as any,
    },
  });

  // 2. Truy vấn Database trước khi đăng nhập (Dùng API Key)
  console.log(
    "\n2. Truy vấn Database khi chưa đăng nhập (Public/Anon access):",
  );
  const { data: todos, error: todosError } = await requin
    .from("todos")
    .select("id, title, completed")
    .eq("completed", true);

  console.log("   Result:", todos);

  // 3. User Authentication (Đăng nhập với email & password)
  console.log("\n3. Đăng nhập người dùng (Native Requin Auth):");
  const { data: authData, error: authError } =
    await requin.auth.signInWithPassword({
      email: "dev@coffup.tech",
      password: "SuperSecretPassword123!",
    });

  if (authError) {
    console.error("   Đăng nhập thất bại:", authError);
    return;
  }
  console.log(`   ✅ Đăng nhập thành công! User ID: ${authData.user?.id}`);
  console.log(`   🔑 JWT Access Token: ${authData.session?.access_token}`);

  // 4. Truy vấn Database sau khi đăng nhập (Tự động đính kèm User JWT)
  console.log(
    "\n4. Truy vấn Database sau khi đăng nhập (Authenticated access):",
  );
  const { data: insertedTodo } = await requin
    .from("todos")
    .insert({ title: "Thêm tính năng mới", completed: false })
    .select();

  console.log("   Inserted Todo:", insertedTodo);

  // 5. Gọi Stored Procedure qua RPC
  console.log("\n5. Gọi Stored Procedure via RPC:");
  const { data: rpcData } = await requin.rpc("hello_world", { greeting: "Hi" });
  console.log("   RPC Output:", rpcData);

  // 6. Gọi Edge Serverless Function
  console.log(
    "\n6. Kích hoạt Edge Serverless Function (/functions/v1/process-data):",
  );
  const { data: fnResult, error: fnError } = await requin.functions.invoke(
    "process-data",
    {
      body: { items: ["Task 1", "Task 2", "Task 3"] },
    },
  );
  console.log("   Function Output:", fnResult);

  // 7. Đăng xuất
  console.log("\n7. Đăng xuất người dùng:");
  await requin.auth.signOut();
  console.log("   ✅ Đã đăng xuất!");

  // 8. Truy vấn sau khi đăng xuất (Tự động revert về API Key)
  console.log("\n8. Truy vấn sau khi đăng xuất (Tự động hoàn về API Key):");
  await requin.from("todos").select("*");

  console.log(
    "\n===============================================================",
  );
  console.log(
    "  🎉 HOÀN THÀNH TOÀN BỘ CÁC BƯỚC TEST KẾT NỐI VÀ THAO TÁC!       ",
  );
  console.log(
    "===============================================================",
  );
}

main().catch(console.error);
