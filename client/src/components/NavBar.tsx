import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { LogOut } from "lucide-react";
import { Role } from "core";
import { authClient, useSession } from "@/lib/auth-client";
import { cn } from "@/lib/utils";

type NavItem = { to: string; label: string; index: string; adminOnly?: boolean };

const NAV_ITEMS: NavItem[] = [
  { to: "/", label: "Overview", index: "01" },
  { to: "/tickets", label: "Tickets", index: "02" },
  { to: "/users", label: "Users", index: "03", adminOnly: true },
];

export function NavBar() {
  const { data: session } = useSession();
  const navigate = useNavigate();
  const location = useLocation();

  const handleSignOut = async () => {
    await authClient.signOut({
      fetchOptions: {
        onSuccess: () => navigate("/login", { replace: true }),
      },
    });
  };

  const visibleItems = NAV_ITEMS.filter(
    (item) => !item.adminOnly || session?.user.role === Role.ADMIN,
  );

  const userInitials = session?.user.name
    ? session.user.name
        .split(" ")
        .map((s) => s[0])
        .filter(Boolean)
        .slice(0, 2)
        .join("")
        .toUpperCase()
    : "··";

  return (
    <header className="sticky top-0 z-30 border-b hairline bg-background/85 backdrop-blur-xl">
      <div className="flex h-14 items-center gap-6 px-5 sm:px-8">
        {/* Brand */}
        <NavLink
          to="/"
          className="group flex items-center gap-2.5"
          aria-label="Helpdesk"
        >
          <BrandMark />
          <div className="flex flex-col leading-none">
            <span className="text-[13px] font-semibold tracking-tight">
              Helpdesk
            </span>
            <span className="font-mono text-[9px] tracking-widest uppercase text-muted-foreground">
              Console · v0.1
            </span>
          </div>
        </NavLink>

        {session && (
          <div className="hidden items-center gap-1 md:flex">
            <span aria-hidden className="mx-2 h-5 w-px bg-border" />
            <nav className="flex items-center gap-0.5" aria-label="Primary">
              {visibleItems.map((item) => {
                const isActive =
                  item.to === "/"
                    ? location.pathname === "/"
                    : location.pathname.startsWith(item.to);
                return (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    className={cn(
                      "group/navitem relative flex items-center gap-2 rounded-md px-2.5 py-1.5 text-[13px] transition-colors",
                      isActive
                        ? "text-foreground"
                        : "text-muted-foreground hover:text-foreground",
                    )}
                  >
                    <span
                      aria-hidden
                      className={cn(
                        "font-mono text-[9px] tracking-wider transition-colors",
                        isActive
                          ? "text-foreground/80"
                          : "text-muted-foreground/60",
                      )}
                    >
                      {item.index}
                    </span>
                    <span className="font-medium">{item.label}</span>
                    {isActive && (
                      <span
                        aria-hidden
                        className="absolute inset-x-2.5 -bottom-[13px] h-px bg-foreground"
                      />
                    )}
                  </NavLink>
                );
              })}
            </nav>
          </div>
        )}

        <div className="ml-auto flex items-center gap-3">
          {session && (
            <>
              <kbd
                aria-hidden
                className="hidden items-center gap-1 rounded-md border hairline bg-surface-2 px-1.5 py-0.5 font-mono text-[10px] tracking-wide text-muted-foreground sm:inline-flex"
              >
                <span>⌘</span>
                <span>K</span>
              </kbd>
              <div className="flex items-center gap-2.5">
                <div
                  className="grid size-7 place-items-center rounded-full bg-foreground font-mono text-[10px] font-semibold tracking-wide text-background"
                  aria-hidden
                >
                  {userInitials}
                </div>
                <div className="hidden flex-col leading-tight sm:flex">
                  <span className="text-[12px] font-medium">
                    {session.user.name}
                  </span>
                  <span className="font-mono text-[9px] tracking-widest uppercase text-muted-foreground">
                    {session.user.role === Role.ADMIN ? "Admin" : "Agent"}
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={handleSignOut}
                className="group/signout inline-flex h-8 items-center gap-1.5 rounded-md border hairline bg-transparent px-2.5 text-[12px] font-medium text-muted-foreground transition-colors hover:bg-surface-2 hover:text-foreground"
                aria-label="Sign out"
              >
                <LogOut className="size-3.5" />
                <span className="hidden sm:inline">Sign out</span>
              </button>
            </>
          )}
        </div>
      </div>
    </header>
  );
}

function BrandMark() {
  return (
    <div
      aria-hidden
      className="relative grid size-8 place-items-center rounded-md bg-foreground"
    >
      {/* a tiny "command/queue" glyph */}
      <svg
        viewBox="0 0 16 16"
        className="size-4 text-background"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="square"
      >
        <path d="M3 5h10" />
        <path d="M3 8h6" />
        <path d="M3 11h10" />
      </svg>
      <span
        aria-hidden
        className="absolute -right-1 -bottom-1 size-2 rounded-full bg-signal ring-2 ring-background"
      />
    </div>
  );
}
