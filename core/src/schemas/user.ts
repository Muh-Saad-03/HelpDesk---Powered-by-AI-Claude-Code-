import { z } from "zod";

export const createUserSchema = z.object({
	name: z.string().trim().min(3, "Name must be at least 3 characters"),
	email: z.email("Enter a valid email"),
	password: z.string().trim().min(8, "Minimum of 8 characters"),
});

export type CreateUserInput = z.infer<typeof createUserSchema>;

// Edit form: name + email behave like create; password is optional. The form
// always submits a string (empty if untouched), so we accept "" as a sentinel
// for "no change" — the server should not re-hash an empty password.
export const updateUserSchema = z.object({
	name: z.string().trim().min(3, "Name must be at least 3 characters"),
	email: z.email("Enter a valid email"),
	password: z
		.string()
		.trim()
		.min(8, "Minimum of 8 characters")
		.or(z.literal(""))
		.optional(),
});

export type UpdateUserInput = z.infer<typeof updateUserSchema>;
