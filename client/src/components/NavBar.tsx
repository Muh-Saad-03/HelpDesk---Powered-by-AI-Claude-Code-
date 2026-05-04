import { Link, useNavigate } from "react-router-dom";
import { Role } from "core";
import { authClient, useSession } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";

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
    <nav className="flex items-center justify-between border-b px-6 py-3">
      <div className="flex items-center gap-6">
        <Link to="/" className="font-semibold">
          Helpdesk
        </Link>
        {session && (
          <Link
            to="/tickets"
            className="text-sm text-muted-foreground hover:text-foreground"
          >
            Tickets
          </Link>
        )}
        {session?.user.role === Role.ADMIN && (
          <Link
            to="/users"
            className="text-sm text-muted-foreground hover:text-foreground"
          >
            Users
          </Link>
        )}
      </div>
      {session && (
        <div className="flex items-center gap-3">
          <span className="text-sm text-muted-foreground">
            {session.user.name}
          </span>
          <Button variant="outline" size="sm" onClick={handleSignOut}>
            Sign out
          </Button>
        </div>
      )}
    </nav>
  );
}
