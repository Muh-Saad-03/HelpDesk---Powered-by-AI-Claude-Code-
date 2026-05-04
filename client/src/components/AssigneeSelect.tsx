import axios from "axios";
import { useQuery } from "@tanstack/react-query";
import { useUpdateTicket } from "@/lib/useUpdateTicket";
import { SELECT_CLASS } from "@/lib/utils";

type AssignableUser = { id: string; name: string; email: string };
type AssignableUsersResponse = { users: AssignableUser[] };

export function AssigneeSelect({
	ticketId,
	currentAssigneeId,
}: {
	ticketId: string;
	currentAssigneeId: string | null;
}) {
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

	const mutation = useUpdateTicket(ticketId);

	const handleChange = (value: string) => {
		mutation.mutate({ assigneeId: value === "" ? null : value });
	};

	return (
		<div className='flex flex-wrap items-center gap-2'>
			<select
				className={`${SELECT_CLASS} w-full`}
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
