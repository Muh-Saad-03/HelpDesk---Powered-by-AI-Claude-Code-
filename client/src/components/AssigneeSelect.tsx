import axios from "axios";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { type AssignTicketInput } from "core";

type AssignableUser = { id: string; name: string; email: string };
type AssignableUsersResponse = { users: AssignableUser[] };

const SELECT_CLASS =
	"h-8 rounded-lg border border-input bg-transparent px-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:opacity-50";

export function AssigneeSelect({
	ticketId,
	currentAssigneeId,
}: {
	ticketId: string;
	currentAssigneeId: string | null;
}) {
	const queryClient = useQueryClient();

	const { data: users, isPending: isLoadingUsers } = useQuery({
		queryKey: ["users", "assignable"],
		queryFn: async ({ signal }) => {
			const res = await axios.get<AssignableUsersResponse>(
				"/api/users/assignable",
				{ withCredentials: true, signal },
			);
			return res.data.users;
		},
	});

	const mutation = useMutation({
		mutationFn: async (assigneeId: string | null) => {
			const body: AssignTicketInput = { assigneeId };
			await axios.patch(`/api/tickets/${ticketId}`, body, {
				withCredentials: true,
			});
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["ticket", ticketId] });
		},
	});

	const handleChange = (value: string) => {
		mutation.mutate(value === "" ? null : value);
	};

	return (
		<div className='flex flex-wrap items-center gap-2'>
			<select
				className={SELECT_CLASS}
				value={currentAssigneeId ?? ""}
				disabled={isLoadingUsers || mutation.isPending}
				onChange={(e) => handleChange(e.target.value)}
				aria-label='Assignee'>
				<option value=''>Unassigned</option>
				{users?.map((u) => (
					<option
						key={u.id}
						value={u.id}>
						{u.name}
					</option>
				))}
			</select>
			{mutation.isPending ? (
				<span className='text-xs text-muted-foreground'>Saving…</span>
			) : mutation.isError ? (
				<span
					role='alert'
					className='text-xs text-destructive'>
					Failed to update assignee
				</span>
			) : null}
		</div>
	);
}
