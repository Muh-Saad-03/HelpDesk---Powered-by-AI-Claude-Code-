/** @format */

import { useState } from "react";
import axios from "axios";
import { useQuery } from "@tanstack/react-query";
import { PlusIcon } from "lucide-react";
import { NavBar } from "../components/NavBar";
import { ConfirmDeleteUserDialog } from "../components/ConfirmDeleteUserDialog";
import {
	UserFormDialog,
	type UserFormDialogState,
} from "../components/UserFormDialog";
import { UsersTable, type User } from "../components/UsersTable";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";

type UsersResponse = { users: User[] };

type PageDialog = UserFormDialogState | { mode: "delete"; user: User };

export function UsersPage() {
	const [dialog, setDialog] = useState<PageDialog>(null);
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
			<main className='mx-auto max-w-6xl p-8'>
				<div className='mb-6 flex items-center justify-between gap-4'>
					<h1 className='text-2xl font-semibold tracking-tight'>Users</h1>
					<Button onClick={() => setDialog({ mode: "create" })}>
						<PlusIcon />
						New User
					</Button>
				</div>

				{isError ? (
					<Alert variant='destructive'>
						<AlertDescription>
							Failed to load users: {error.message}
						</AlertDescription>
					</Alert>
				) : isPending ? (
					<UsersTable users={undefined} />
				) : users.length === 0 ? (
					<p className='text-muted-foreground'>No users found.</p>
				) : (
					<UsersTable
						users={users}
						onEdit={(user) => setDialog({ mode: "edit", user })}
						onDelete={(user) => setDialog({ mode: "delete", user })}
					/>
				)}

				<UserFormDialog
					state={
						dialog?.mode === "create" || dialog?.mode === "edit"
							? dialog
							: null
					}
					onClose={() => setDialog(null)}
				/>
				<ConfirmDeleteUserDialog
					user={dialog?.mode === "delete" ? dialog.user : null}
					onClose={() => setDialog(null)}
				/>
			</main>
		</>
	);
}
