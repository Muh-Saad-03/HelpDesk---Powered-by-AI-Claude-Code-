import { z } from "zod";

// Contract for the inbound-email webhook (`POST /api/email/inbound`). The
// endpoint accepts a pre-parsed email payload — any future provider adapter
// (SendGrid Inbound Parse, Mailgun Routes, etc.) is responsible for
// normalizing its multipart body to this shape.
export const inboundEmailSchema = z.object({
	fromEmail: z.email("Enter a valid sender email"),
	fromName: z.string().trim().min(1).optional(),
	subject: z.string(),
	body: z.string().min(1, "Email body is required"),
});

export type InboundEmailInput = z.infer<typeof inboundEmailSchema>;
