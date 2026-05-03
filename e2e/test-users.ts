// Test users seeded into the helpdesk_test database by `bun run db:seed:test`.
// Both are created idempotently by `server/src/seed.ts` — admin from the
// ADMIN_* env vars in `server/.env.test`, agent hard-coded under the
// `NODE_ENV === "test"` branch.

export const ADMIN_USER = {
  email: "admin@test.local",
  password: "test-admin-password",
  name: "Test Admin",
  role: "ADMIN" as const,
};

export const AGENT_USER = {
  email: "agent@test.local",
  password: "test-agent-password",
  name: "Test Agent",
  role: "AGENT" as const,
};
