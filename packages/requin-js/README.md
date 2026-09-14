# @requin/requin-js

> Isomorphic JavaScript / TypeScript client library for Requinbase projects.

`@requin/requin-js` provides an intuitive, modular interface to interact with your Requinbase project (PostgreSQL/OrioleDB Database, Native Authentication, RPC Stored Procedures, and Serverless Edge Functions) using a syntax and developer experience mirroring `supabase-js`.

---

## 📦 Installation

```bash
npm install @requin/requin-js
# or
pnpm add @requin/requin-js
# or
yarn add @requin/requin-js
```

---

## 🚀 Quick Start

Initialize your client using your Project's **Client URL** and **API Key**:

```typescript
import { createClient } from "@requin/requin-js";

const clientUrl = "https://<your-project-slug>.coffup.tech";
const apiKey = "rq_production_xxxxxxxxxxxxxxxx";

export const requin = createClient(clientUrl, apiKey, {
  db: {
    schema: "public",
  },
  auth: {
    autoRefreshToken: true,
  },
});
```

---

## 🗄️ Database Operations (`.from()`)

Powered by PostgREST v12, you can query, insert, update, upsert, and delete records with type-safety and chainable filter methods:

### Select Records with Filters

```typescript
const { data, error, count } = await requin
  .from("todos")
  .select("id, title, status, created_at", { count: "exact" })
  .eq("status", "completed")
  .order("created_at", { ascending: false })
  .limit(10);
```

### Insert Records

```typescript
const { data, error } = await requin
  .from("todos")
  .insert([
    { title: "Buy groceries", status: "pending" },
    { title: "Review PR #42", status: "in_progress" },
  ])
  .select();
```

### Update Records

```typescript
const { data, error } = await requin
  .from("todos")
  .update({ status: "completed" })
  .eq("id", 1);
```

### Delete Records

```typescript
const { data, error } = await requin
  .from("todos")
  .delete()
  .eq("id", 1);
```

### Switch Postgres Schema

```typescript
const { data } = await requin
  .schema("analytics")
  .from("events")
  .select("*");
```

---

## ⚡ Stored Procedures (`.rpc()`)

Execute PostgreSQL Stored Functions and Procedures:

```typescript
const { data, error } = await requin.rpc("calculate_order_discount", {
  order_id: 1042,
  user_tier: "gold",
});
```

---

## 🔑 Native Authentication (`.auth`)

Requinbase projects feature native token minting (RS256 asymmetric keys) and session management:

### Sign Up

```typescript
const { data, error } = await requin.auth.signUp({
  email: "developer@coffup.tech",
  password: "SecurePassword123!",
  options: {
    data: { displayName: "Alex" },
  },
});
```

### Sign In with Password

```typescript
const { data, error } = await requin.auth.signInWithPassword({
  email: "developer@coffup.tech",
  password: "SecurePassword123!",
});

console.log("Logged in user:", data.user);
console.log("JWT Access Token:", data.session?.access_token);
```

> **Automatic JWT Synchronization**: Once a user signs in, all subsequent requests made via `.from(...)`, `.rpc(...)`, and `.functions.invoke(...)` automatically propagate the user's `access_token` in the `Authorization: Bearer <token>` header. When the user signs out, requests automatically revert back to the Project API Key.

### Get Current Session & User

```typescript
const { data: { session } } = await requin.auth.getSession();
const { data: { user } } = await requin.auth.getUser();
```

### Listen to Auth State Changes

```typescript
const { data: { subscription } } = requin.auth.onAuthStateChange((event, session) => {
  console.log("Auth Event:", event); // 'SIGNED_IN', 'SIGNED_OUT', 'TOKEN_REFRESHED'
  console.log("Session:", session);
});

// To unsubscribe:
subscription.unsubscribe();
```

### Sign Out

```typescript
await requin.auth.signOut();
```

### Admin Auth APIs (Server-side with Service Key)

```typescript
const { data: users, error } = await requin.auth.admin.listUsers({
  page: 1,
  perPage: 25,
});
```

---

## 🌐 Serverless Edge Functions (`.functions`)

Invoke serverless functions running on the Requin Runner:

```typescript
const { data, error } = await requin.functions.invoke("process-order", {
  method: "POST",
  body: {
    orderId: "ord_990",
    items: [101, 102],
  },
});

if (error) {
  console.error("Function error:", error.message);
} else {
  console.log("Function response:", data);
}
```

---

## 📄 License

MIT © Coffup / Requin
