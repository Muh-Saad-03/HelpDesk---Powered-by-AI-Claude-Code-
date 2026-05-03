import { spawnSync } from "node:child_process";
import path from "node:path";

// Playwright runs globalSetup in a Node CJS context, so we use __dirname
// rather than import.meta.url and module.exports rather than export default.

async function globalSetup(): Promise<void> {
  const serverCwd = path.resolve(__dirname, "../server");
  const env = { ...process.env, NODE_ENV: "test" };

  const steps: Array<{ name: string; script: string }> = [
    { name: "migrate", script: "db:migrate:test" },
    { name: "seed", script: "db:seed:test" },
  ];

  for (const { name, script } of steps) {
    const result = spawnSync("bun", ["run", script], {
      cwd: serverCwd,
      stdio: "inherit",
      env,
    });
    if (result.status !== 0) {
      throw new Error(
        `Test DB ${name} failed. Ensure helpdesk_test exists and server/.env.test is configured.`,
      );
    }
  }
}

module.exports = globalSetup;
