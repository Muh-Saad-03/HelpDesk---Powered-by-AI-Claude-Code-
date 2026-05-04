/** @format */

import { useState } from "react";
import axios from "axios";
import { useQuery } from "@tanstack/react-query";
import { PlusIcon } from "lucide-react";
import { NavBar } from "../components/NavBar";
import {
	UserFormDialog,
	type UserFormDialogState,
} from "../components/UserFormDialog";
import { UsersTable, type User } from "../components/UsersTable";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";

type UsersResponse = { users: User[] };

export function UsersPage() {
	const [dialog, setDialog] = useState<UserFormDialogState>(null);
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
					/>
				)}

				<UserFormDialog
					state={dialog}
					onClose={() => setDialog(null)}
				/>
			</main>
		</>
	);
}
