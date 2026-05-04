import type { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { type Role } from "core";
import { useSession } from "../lib/auth-client";

export function RequireAuth({
  children,
  role,
}: {
  children: ReactNode;
  role?: Role;
}) {
  const { data: session, isPending } = useSession();

  if (isPending) return null;
  if (!session) return <Navigate to="/login" replace />;
  if (role && session.user.role !== role) return <Navigate to="/" replace />;
  return <>{children}</>;
}
