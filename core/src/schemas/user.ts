import { z } from "zod";

export const createUserSchema = z.object({
	name: z.string().trim().min(3, "Name must be at least 3 characters"),
	email: z.email("Enter a valid email"),
	password: z.string().trim().min(8, "Minimum of 8 characters"),
});

export type CreateUserInput = z.infer<typeof createUserSchema>;
