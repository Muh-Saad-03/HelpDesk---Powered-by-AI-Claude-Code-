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
			<main className='mx-auto max-w-7xl px-5 pt-8 pb-24 sm:px-8 lg:px-12'>
				{/* Header */}
				<div className='mb-8 flex flex-wrap items-end justify-between gap-6 animate-rise'>
					<div>
						<span className='font-mono text-[10px] tracking-[0.22em] uppercase text-muted-foreground'>
							── Section 03 / Access
						</span>
						<div className='mt-3 flex items-baseline gap-3 flex-wrap'>
							<h1 className='text-4xl font-semibold tracking-tight text-display sm:text-[2.75rem]'>
								Users
							</h1>
							{!isPending && users && (
								<span aria-hidden className='font-mono text-2xl font-medium tabular-nums text-muted-foreground/60'>
									{users.length}
								</span>
							)}
						</div>
					</div>
					<button
						type='button'
						onClick={() => setDialog({ mode: "create" })}
						className='group/new inline-flex h-9 items-center gap-2 rounded-md bg-foreground px-3.5 text-[13px] font-medium text-background transition-all hover:bg-foreground/90 active:translate-y-px'>
						<PlusIcon className='size-3.5' />
						<span>New User</span>
						<kbd className='ml-1 hidden items-center gap-0.5 rounded border border-background/20 bg-background/10 px-1.5 py-0.5 font-mono text-[9px] tracking-wide text-background/70 sm:inline-flex'>
							N
						</kbd>
					</button>
				</div>

				{isError ? (
					<Alert variant='destructive'>
						<AlertDescription>
							Failed to load users: {error.message}
						</AlertDescription>
					</Alert>
				) : isPending ? (
					<div className='surface-panel overflow-hidden'>
						<UsersTable users={undefined} />
					</div>
				) : users.length === 0 ? (
					<div className='surface-panel grid place-items-center px-8 py-24 text-center'>
						<div>
							<div className='mx-auto mb-4 size-12 rounded-md border-2 border-dashed border-foreground/20' />
							<p className='text-[14px] font-medium'>No users found.</p>
							<p className='mt-1 font-mono text-[10px] tracking-widest uppercase text-muted-foreground'>
								Add an operator to get started
							</p>
						</div>
					</div>
				) : (
					<div className='surface-panel overflow-hidden animate-rise' style={{ animationDelay: "120ms" }}>
						<UsersTable
							users={users}
							onEdit={(user) => setDialog({ mode: "edit", user })}
							onDelete={(user) => setDialog({ mode: "delete", user })}
						/>
					</div>
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
