# @requin/auth-js

> Native authentication client library for Requinbase projects.

`@requin/auth-js` provides client-side authentication (`signUp`, `signInWithPassword`, `signOut`, `getSession`, `onAuthStateChange`, device flow) and server-side admin APIs for Requinbase projects.

## Installation

```bash
npm install @requin/auth-js
```

## Usage

Usually consumed as part of `@requin/requin-js`:

```typescript
import { createClient } from "@requin/requin-js";

const client = createClient("https://my-app.coffup.tech", "rq_production_xxx");

// Sign in
const { data, error } = await client.auth.signInWithPassword({
  email: "user@coffup.tech",
  password: "password123",
});
```

## License

MIT © RequinJS
