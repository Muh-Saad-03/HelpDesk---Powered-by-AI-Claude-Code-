// Reads INBOUND_EMAIL_SECRET out of server/.env.test (the same file the
// test webServer loads via NODE_ENV=test) so specs sign their webhook
// requests with whatever the server is actually configured to accept.

import { readFileSync } from "node:fs";
import path from "node:path";

function readEnvVar(name: string): string {
  const envPath = path.join(process.cwd(), "server", ".env.test");
  const text = readFileSync(envPath, "utf8");
  const match = text.match(new RegExp(`^${name}="?([^"\\n]+)"?`, "m"));
  if (!match || !match[1]) {
    throw new Error(`${name} not found in ${envPath}`);
  }
  return match[1];
}

export const INBOUND_EMAIL_SECRET = readEnvVar("INBOUND_EMAIL_SECRET");
