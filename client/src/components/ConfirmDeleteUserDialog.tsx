/** @format */

import { useState } from "react";
import axios, { AxiosError } from "axios";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from "@/components/ui/alert-dialog";

type DeletableUser = { id: string; name: string; email: string };

type Props = {
	user: DeletableUser | null;
	onClose: () => void;
};

export function ConfirmDeleteUserDialog({ user, onClose }: Props) {
	const queryClient = useQueryClient();
	const [apiError, setApiError] = useState<string | null>(null);

	const mutation = useMutation({
		mutationFn: (target: DeletableUser) =>
			axios.delete(`/api/users/${target.id}`, { withCredentials: true }),
		onSuccess: async () => {
			await queryClient.invalidateQueries({ queryKey: ["users"] });
			setApiError(null);
			onClose();
		},
		onError: (err: AxiosError<{ error?: string }>) => {
			setApiError(err.response?.data?.error ?? "Failed to delete user");
		},
	});

	function handleOpenChange(next: boolean) {
		if (!next) {
			setApiError(null);
			onClose();
		}
	}

	return (
		<AlertDialog
			open={user !== null}
			onOpenChange={handleOpenChange}>
			<AlertDialogContent>
				<AlertDialogHeader>
					<AlertDialogTitle>Delete user?</AlertDialogTitle>
					<AlertDialogDescription>
						{user ? (
							<>
								Permanently soft-deletes <strong>{user.name}</strong> (
								{user.email}). They will be logged out immediately and cannot
								sign in again.
							</>
						) : null}
					</AlertDialogDescription>
				</AlertDialogHeader>
				{apiError && (
					<Alert variant='destructive'>
						<AlertDescription>{apiError}</AlertDescription>
					</Alert>
				)}
				<AlertDialogFooter>
					<AlertDialogCancel disabled={mutation.isPending}>
						Cancel
					</AlertDialogCancel>
					<AlertDialogAction
						variant='destructive'
						disabled={mutation.isPending || user === null}
						onClick={() => {
							if (user) mutation.mutate(user);
						}}>
						{mutation.isPending ? "Deleting..." : "Delete"}
					</AlertDialogAction>
				</AlertDialogFooter>
			</AlertDialogContent>
		</AlertDialog>
	);
}
