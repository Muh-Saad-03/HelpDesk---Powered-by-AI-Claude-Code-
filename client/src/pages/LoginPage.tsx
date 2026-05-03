/** @format */

import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Navigate, useNavigate } from "react-router-dom";
import { authClient, useSession } from "@/lib/auth-client";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import {
	Field,
	FieldError,
	FieldGroup,
	FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";

const loginSchema = z.object({
	email: z.email("Enter a valid email"),
	password: z.string().min(1, "Password is required"),
});

type LoginInput = z.infer<typeof loginSchema>;

export function LoginPage() {
	const navigate = useNavigate();
	const { data: session, isPending: sessionPending } = useSession();
	const [apiError, setApiError] = useState<string | null>(null);

	const {
		control,
		handleSubmit,
		formState: { isSubmitting },
	} = useForm<LoginInput>({
		resolver: zodResolver(loginSchema),
		defaultValues: { email: "", password: "" },
		mode: "onChange",
	});

	if (sessionPending) return null;
	if (session)
		return (
			<Navigate
				to='/'
				replace
			/>
		);

	const onSubmit = handleSubmit(async ({ email, password }) => {
		setApiError(null);
		await authClient.signIn.email(
			{ email, password },
			{
				onSuccess: () => navigate("/", { replace: true }),
				onError: (ctx) => setApiError(ctx.error.message ?? "Sign-in failed"),
			},
		);
	});

	return (
		<main className='grid min-h-screen place-items-center bg-muted/30 p-6'>
			<Card className='w-full max-w-sm'>
				<CardHeader>
					<CardTitle className='text-xl'>Sign in</CardTitle>
					<CardDescription>Sign into your account</CardDescription>
				</CardHeader>
				<CardContent>
					<form
						onSubmit={onSubmit}
						noValidate>
						<FieldGroup>
							<Controller
								name='email'
								control={control}
								render={({ field, fieldState }) => (
									<Field data-invalid={fieldState.invalid}>
										<FieldLabel htmlFor='login-email'>Email</FieldLabel>
										<Input
											{...field}
											id='login-email'
											type='email'
											autoComplete='email'
											placeholder='you@example.com'
											aria-invalid={fieldState.invalid}
										/>
										{fieldState.invalid && (
											<FieldError errors={[fieldState.error]} />
										)}
									</Field>
								)}
							/>
							<Controller
								name='password'
								control={control}
								render={({ field, fieldState }) => (
									<Field data-invalid={fieldState.invalid}>
										<FieldLabel htmlFor='login-password'>Password</FieldLabel>
										<Input
											{...field}
											id='login-password'
											type='password'
											autoComplete='current-password'
											aria-invalid={fieldState.invalid}
										/>
										{fieldState.invalid && (
											<FieldError errors={[fieldState.error]} />
										)}
									</Field>
								)}
							/>
							{apiError && (
								<Alert variant='destructive'>
									<AlertDescription>{apiError}</AlertDescription>
								</Alert>
							)}
							<Button
								type='submit'
								disabled={isSubmitting}
								size='lg'>
								{isSubmitting ? "Signing in..." : "Sign in"}
							</Button>
						</FieldGroup>
					</form>
				</CardContent>
			</Card>
		</main>
	);
}
