import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Navigate, useNavigate } from "react-router-dom";
import { authClient, useSession } from "../lib/auth-client";

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
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
    mode: "onChange",
  });

  if (sessionPending) return null;
  if (session) return <Navigate to="/" replace />;

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
    <main className="grid min-h-screen place-items-center bg-gradient-to-b from-indigo-50 via-white to-white p-6">
      <form
        className="flex w-full max-w-sm flex-col gap-4 rounded-2xl border border-black/10 bg-white/90 p-9 shadow-xl backdrop-blur"
        onSubmit={onSubmit}
        noValidate
      >
        <h1 className="mb-1 text-2xl font-semibold tracking-tight">Sign in</h1>
        <label className="flex flex-col gap-1.5 text-xs font-medium text-gray-600">
          Email
          <input
            type="email"
            autoComplete="email"
            aria-invalid={!!errors.email}
            {...register("email")}
            className="rounded-lg border border-black/15 bg-white px-3.5 py-2.5 text-sm text-gray-900 outline-none transition hover:border-black/25 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/30 aria-invalid:border-red-500 aria-invalid:focus:ring-red-500/30"
          />
          {errors.email && (
            <span className="text-xs font-medium text-red-600">
              {errors.email.message}
            </span>
          )}
        </label>
        <label className="flex flex-col gap-1.5 text-xs font-medium text-gray-600">
          Password
          <input
            type="password"
            autoComplete="current-password"
            aria-invalid={!!errors.password}
            {...register("password")}
            className="rounded-lg border border-black/15 bg-white px-3.5 py-2.5 text-sm text-gray-900 outline-none transition hover:border-black/25 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/30 aria-invalid:border-red-500 aria-invalid:focus:ring-red-500/30"
          />
          {errors.password && (
            <span className="text-xs font-medium text-red-600">
              {errors.password.message}
            </span>
          )}
        </label>
        {apiError && (
          <p className="text-xs font-medium text-red-600">{apiError}</p>
        )}
        <button
          type="submit"
          disabled={isSubmitting}
          className="mt-1 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow transition hover:bg-indigo-700 active:translate-y-px disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isSubmitting ? "Signing in..." : "Sign in"}
        </button>
      </form>
    </main>
  );
}
