import axios from "axios";
import { useQuery } from "@tanstack/react-query";
import { NavBar } from "../components/NavBar";
import { Alert, AlertDescription } from "@/components/ui/alert";

type User = {
  id: string;
  name: string;
  email: string;
  role: "ADMIN" | "AGENT";
  createdAt: string;
};

type UsersResponse = { users: User[] };

const dateFormatter = new Intl.DateTimeFormat(undefined, {
  dateStyle: "medium",
});

export function UsersPage() {
  const {
    data: users,
    isPending,
    isError,
    error,
  } = useQuery({
    queryKey: ["users"],
    queryFn: async ({ signal }) => {
      const res = await axios.get<UsersResponse>("/api/users", {
        withCredentials: true,
        signal,
      });
      return res.data.users;
    },
  });

  return (
    <>
      <NavBar />
      <main className="p-8">
        <h1 className="mb-6 text-2xl font-semibold tracking-tight">Users</h1>

        {isError ? (
          <Alert variant="destructive">
            <AlertDescription>
              Failed to load users: {error.message}
            </AlertDescription>
          </Alert>
        ) : isPending ? (
          <p className="text-muted-foreground">Loading…</p>
        ) : users.length === 0 ? (
          <p className="text-muted-foreground">No users found.</p>
        ) : (
          <div className="overflow-hidden rounded-md border">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-left">
                <tr>
                  <th className="px-4 py-2 font-medium">Name</th>
                  <th className="px-4 py-2 font-medium">Email</th>
                  <th className="px-4 py-2 font-medium">Role</th>
                  <th className="px-4 py-2 font-medium">Created</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id} className="border-t">
                    <td className="px-4 py-2">{u.name}</td>
                    <td className="px-4 py-2">{u.email}</td>
                    <td className="px-4 py-2">
                      <span
                        className={
                          "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium " +
                          (u.role === "ADMIN"
                            ? "bg-primary/10 text-primary"
                            : "bg-muted text-muted-foreground")
                        }
                      >
                        {u.role.toLowerCase()}
                      </span>
                    </td>
                    <td className="px-4 py-2">
                      {dateFormatter.format(new Date(u.createdAt))}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </>
  );
}
