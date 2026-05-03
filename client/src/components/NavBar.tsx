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
    <nav className="navbar">
      <span className="navbar-title">Helpdesk</span>
      {session && (
        <div className="navbar-user">
          <span>{session.user.name}</span>
          <button type="button" onClick={handleSignOut}>
            Sign out
          </button>
        </div>
      )}
    </nav>
  );
}
