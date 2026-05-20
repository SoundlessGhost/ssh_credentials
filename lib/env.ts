// Centralized env access. Server-rendered consts are evaluated at build time
// for NEXT_PUBLIC_* and at runtime for everything else.
// Real implementation lands in step 3.

export const env = {
  apiUrl: process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080",
};
