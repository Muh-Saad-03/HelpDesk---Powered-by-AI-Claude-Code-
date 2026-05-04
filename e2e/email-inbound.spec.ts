// HTTP-level coverage for POST /api/email/inbound — the webhook a future
// email provider will call to convert an inbound email into a ticket.
//
// The endpoint is unauthenticated by Better Auth; it's gated by a shared
// secret in the X-Webhook-Secret header. The secret is read by
// e2e/inbound-email.ts out of server/.env.test so this spec stays in
// lockstep with what the server actually accepts.

import { test, expect } from "@playwright/test";
import { INBOUND_EMAIL_SECRET } from "./inbound-email";

const validBody = {
  fromEmail: "jane@example.com",
  fromName: "Jane Doe",
  subject: "Help with billing",
  body: "My invoice from October is wrong.",
};

test.describe("Inbound email webhook — POST /api/email/inbound", () => {
  test("creates a ticket on a valid signed request", async ({ request }) => {
    const response = await request.post("/api/email/inbound", {
      headers: { "X-Webhook-Secret": INBOUND_EMAIL_SECRET },
      data: validBody,
    });

    expect(response.status()).toBe(201);
    const json = (await response.json()) as { ticket: { id: string } };
    expect(json.ticket.id).toMatch(/^c[a-z0-9]+$/); // cuid shape
  });

  test("rejects a request with the wrong secret", async ({ request }) => {
    const response = await request.post("/api/email/inbound", {
      headers: { "X-Webhook-Secret": "definitely-not-the-secret" },
      data: validBody,
    });

    expect(response.status()).toBe(401);
  });

  test("rejects a request with no secret header", async ({ request }) => {
    const response = await request.post("/api/email/inbound", {
      data: validBody,
    });

    expect(response.status()).toBe(401);
  });

  test("returns 400 when the body fails zod validation", async ({
    request,
  }) => {
    const response = await request.post("/api/email/inbound", {
      headers: { "X-Webhook-Secret": INBOUND_EMAIL_SECRET },
      data: { ...validBody, body: "" },
    });

    expect(response.status()).toBe(400);
    const json = (await response.json()) as { error: string };
    expect(json.error).toBe("Email body is required");
  });

  test("accepts an empty subject (server coerces to a placeholder)", async ({
    request,
  }) => {
    const response = await request.post("/api/email/inbound", {
      headers: { "X-Webhook-Secret": INBOUND_EMAIL_SECRET },
      data: { ...validBody, subject: "" },
    });

    expect(response.status()).toBe(201);
    const json = (await response.json()) as { ticket: { id: string } };
    expect(json.ticket.id).toBeTruthy();
  });

  test("skips bounce senders (mailer-daemon@) without creating a ticket", async ({
    request,
  }) => {
    const response = await request.post("/api/email/inbound", {
      headers: { "X-Webhook-Secret": INBOUND_EMAIL_SECRET },
      data: {
        ...validBody,
        fromEmail: "MAILER-DAEMON@example.com",
        subject: "Undelivered Mail Returned to Sender",
      },
    });

    expect(response.status()).toBe(200);
    const json = (await response.json()) as { ok: boolean; skipped: string };
    expect(json).toEqual({ ok: true, skipped: "bounce" });
  });

  test("skips postmaster senders without creating a ticket", async ({
    request,
  }) => {
    const response = await request.post("/api/email/inbound", {
      headers: { "X-Webhook-Secret": INBOUND_EMAIL_SECRET },
      data: { ...validBody, fromEmail: "postmaster@example.com" },
    });

    expect(response.status()).toBe(200);
    const json = (await response.json()) as { ok: boolean; skipped: string };
    expect(json.skipped).toBe("bounce");
  });
});
