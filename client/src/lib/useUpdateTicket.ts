import axios from "axios";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { type UpdateTicketInput } from "core";

// Shared mutation for any partial-update of a ticket (assignee, status,
// category). Each field-specific select on the detail page wraps this hook
// rather than re-implementing the PATCH + invalidate plumbing.
export function useUpdateTicket(ticketId: string) {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: async (input: UpdateTicketInput) => {
			await axios.patch(`/api/tickets/${ticketId}`, input, {
				withCredentials: true,
			});
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["ticket", ticketId] });
		},
	});
}
