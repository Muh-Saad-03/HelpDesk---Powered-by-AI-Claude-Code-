/** @format */

import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Navigate, useNavigate } from "react-router-dom";
import { ArrowRight, ShieldCheck } from "lucide-react";
import { authClient, useSession } from "@/lib/auth-client";
import { Alert, AlertDescription } from "@/components/ui/alert";
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
	if (session) return <Navigate to='/' replace />;

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
		<main className="grid min-h-screen lg:grid-cols-[1.05fr_1fr]">
			{/* Left — informational panel */}
			<aside className="relative hidden overflow-hidden border-r hairline bg-surface lg:block">
				<div className="absolute inset-0 bg-grid opacity-60" aria-hidden />
				<div
					aria-hidden
					className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-foreground/20 to-transparent"
				/>
				<div
					aria-hidden
					className="pointer-events-none absolute -top-40 -left-40 size-[40rem] rounded-full bg-signal/8 blur-3xl"
				/>

				<div className="relative flex h-full flex-col justify-between p-12 xl:p-16">
					<div className="flex items-center gap-3">
						<div className="relative grid size-9 place-items-center rounded-md bg-foreground">
							<svg
								viewBox="0 0 16 16"
								className="size-5 text-background"
								fill="none"
								stroke="currentColor"
								strokeWidth="1.6"
								strokeLinecap="square">
								<path d="M3 5h10" />
								<path d="M3 8h6" />
								<path d="M3 11h10" />
							</svg>
							<span
								aria-hidden
								className="absolute -right-1 -bottom-1 size-2 rounded-full bg-signal ring-2 ring-surface"
							/>
						</div>
						<div className="flex flex-col leading-none">
							<span className="text-[15px] font-semibold tracking-tight">
								Helpdesk
							</span>
							<span className="font-mono text-[10px] tracking-widest uppercase text-muted-foreground">
								Operator Console · v0.1
							</span>
						</div>
					</div>

					<div className="max-w-md animate-rise">
						<span className="font-mono text-[10px] tracking-[0.2em] uppercase text-muted-foreground">
							[ access · agents only ]
						</span>
						<h1 className="mt-5 text-[2.6rem] leading-[1.05] font-semibold tracking-tight text-display">
							The control surface for your support queue.
						</h1>
						<p className="mt-5 text-[15px] leading-relaxed text-muted-foreground">
							Triage, reply, resolve. Every ticket — assisted by AI, finished
							by you.
						</p>

						<dl className="mt-10 grid grid-cols-3 gap-px overflow-hidden rounded-md border hairline bg-hairline">
							{[
								{ k: "Avg first reply", v: "2.4m" },
								{ k: "AI assist rate", v: "61%" },
								{ k: "Open SLA", v: "99.2%" },
							].map((s) => (
								<div
									key={s.k}
									className="flex flex-col gap-1 bg-surface px-4 py-4">
									<dt className="font-mono text-[9px] tracking-widest uppercase text-muted-foreground">
										{s.k}
									</dt>
									<dd className="font-mono text-2xl font-semibold tabular-nums">
										{s.v}
									</dd>
								</div>
							))}
						</dl>
					</div>

					<div className="flex items-end justify-between gap-4 font-mono text-[10px] tracking-widest uppercase text-muted-foreground">
						<div className="flex items-center gap-2">
							<span className="status-dot bg-status-resolved text-status-resolved animate-pulse-dot" />
							<span>System nominal</span>
						</div>
						<span>{new Date().getUTCFullYear()} · Internal</span>
					</div>
				</div>
			</aside>

			{/* Right — login form */}
			<section className="relative flex items-center justify-center p-6 sm:p-12">
				<div className="w-full max-w-sm animate-rise">
					{/* mobile brand */}
					<div className="mb-10 flex items-center gap-2.5 lg:hidden">
						<div className="relative grid size-8 place-items-center rounded-md bg-foreground">
							<svg
								viewBox="0 0 16 16"
								className="size-4 text-background"
								fill="none"
								stroke="currentColor"
								strokeWidth="1.6">
								<path d="M3 5h10" />
								<path d="M3 8h6" />
								<path d="M3 11h10" />
							</svg>
							<span
								aria-hidden
								className="absolute -right-1 -bottom-1 size-2 rounded-full bg-signal ring-2 ring-background"
							/>
						</div>
						<span className="text-[14px] font-semibold tracking-tight">
							Helpdesk
						</span>
					</div>

					<div className="mb-8">
						<span className="font-mono text-[10px] tracking-[0.2em] uppercase text-muted-foreground">
							01 · Authenticate
						</span>
						<h2 className="mt-2 text-3xl font-semibold tracking-tight text-display">
							Sign in
						</h2>
						<p className="mt-2 text-[14px] text-muted-foreground">
							Enter your operator credentials to continue.
						</p>
					</div>

					<form onSubmit={onSubmit} noValidate>
						<FieldGroup>
							<Controller
								name='email'
								control={control}
								render={({ field, fieldState }) => (
									<Field data-invalid={fieldState.invalid}>
										<FieldLabel
											htmlFor='login-email'
											className="font-mono text-[10px] tracking-widest uppercase text-muted-foreground">
											Email
										</FieldLabel>
										<Input
											{...field}
											id='login-email'
											type='email'
											autoComplete='email'
											placeholder='you@example.com'
											aria-invalid={fieldState.invalid}
											className="h-10 font-mono text-[13px]"
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
										<FieldLabel
											htmlFor='login-password'
											className="font-mono text-[10px] tracking-widest uppercase text-muted-foreground">
											Password
										</FieldLabel>
										<Input
											{...field}
											id='login-password'
											type='password'
											autoComplete='current-password'
											aria-invalid={fieldState.invalid}
											className="h-10 font-mono text-[13px]"
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

							<button
								type='submit'
								disabled={isSubmitting}
								className="group/submit relative inline-flex h-11 items-center justify-center gap-2 overflow-hidden rounded-md bg-foreground px-4 text-[13px] font-medium text-background transition-all hover:bg-foreground/90 disabled:opacity-60 active:translate-y-px">
								<span className="font-mono text-[10px] tracking-widest uppercase opacity-60">
									{isSubmitting ? "···" : "↵"}
								</span>
								<span>{isSubmitting ? "Authenticating…" : "Sign in"}</span>
								<ArrowRight className="size-4 transition-transform group-hover/submit:translate-x-0.5" />
							</button>
						</FieldGroup>
					</form>

					<div className="mt-10 flex items-center gap-2 text-[12px] text-muted-foreground">
						<ShieldCheck className="size-3.5" />
						<span>Sessions are encrypted and stored server-side.</span>
					</div>
				</div>
			</section>
		</main>
	);
}
