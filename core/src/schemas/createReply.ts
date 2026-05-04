import { z } from "zod";

// Body for POST /api/tickets/:id/replies. The reply text is the only client
// input — the author is resolved server-side from the session, and the
// ticket id comes from the URL.
export const createReplySchema = z.object({
	body: z
		.string()
		.trim()
		.min(1, "Reply cannot be empty")
		.max(10_000, "Reply is too long"),
});

export type CreateReplyInput = z.infer<typeof createReplySchema>;

// Body for POST /api/tickets/:id/polish-reply. Same shape as a reply draft —
// the agent's draft text is the only input; ticket context is loaded
// server-side.
export const polishReplySchema = createReplySchema;

export type PolishReplyInput = z.infer<typeof polishReplySchema>;
