import { useNavigate } from "react-router-dom";
import { authClient, useSession } from "../lib/auth-client";

export function NavBar() {
  const { data: session } = useSession();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await authClient.signOut({
      fetchOptions: {
        onSuccess: () => navigate("/login", { replace: true }),
      },
    });
  };

  return (
    <nav className="flex items-center justify-between border-b border-black/10 px-6 py-3">
      <span className="font-semibold">Helpdesk</span>
      {session && (
        <div className="flex items-center gap-3">
          <span>{session.user.name}</span>
          <button
            type="button"
            onClick={handleSignOut}
            className="rounded-md border border-black/15 bg-white px-3 py-1.5 text-sm font-medium hover:bg-gray-50"
          >
            Sign out
          </button>
        </div>
      )}
    </nav>
  );
}
