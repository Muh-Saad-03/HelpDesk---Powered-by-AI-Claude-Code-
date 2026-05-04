/** @format */

import { PencilIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

export type User = {
	id: string;
	name: string;
	email: string;
	role: "ADMIN" | "AGENT";
	createdAt: string;
};

type Props = {
	users: User[] | undefined;
	onEdit?: (user: User) => void;
};

const dateFormatter = new Intl.DateTimeFormat(undefined, {
	dateStyle: "medium",
});

const SKELETON_ROW_COUNT = 5;

export function UsersTable({ users, onEdit }: Props) {
	const isLoading = users === undefined;

	return (
		<div>
			<table className='w-full text-sm'>
				<thead className='text-left'>
					<tr className='border-b'>
						<th className='px-4 py-2 font-medium'>Name</th>
						<th className='px-4 py-2 font-medium'>Email</th>
						<th className='px-4 py-2 font-medium'>Role</th>
						<th className='px-4 py-2 font-medium'>Created</th>
						<th className='w-px px-4 py-2 font-medium'>Actions</th>
					</tr>
				</thead>
				<tbody>
					{isLoading
						? Array.from({ length: SKELETON_ROW_COUNT }).map((_, i) => (
								<tr
									key={i}
									className='border-t'>
									<td className='px-4 py-2'>
										<Skeleton className='h-4 w-32' />
									</td>
									<td className='px-4 py-2'>
										<Skeleton className='h-4 w-48' />
									</td>
									<td className='px-4 py-2'>
										<Skeleton className='h-5 w-16 rounded-full' />
									</td>
									<td className='px-4 py-2'>
										<Skeleton className='h-4 w-24' />
									</td>
									<td className='px-4 py-2'>
										<Skeleton className='h-7 w-7 rounded-md' />
									</td>
								</tr>
							))
						: users.map((u) => (
								<tr
									key={u.id}
									className='border-t'>
									<td className='px-4 py-2'>{u.name}</td>
									<td className='px-4 py-2'>{u.email}</td>
									<td className='px-4 py-2'>
										<span
											className={
												"inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium " +
												(u.role === "ADMIN"
													? "bg-primary/10 text-primary"
													: "bg-muted text-muted-foreground")
											}>
											{u.role.toLowerCase()}
										</span>
									</td>
									<td className='px-4 py-2'>
										{dateFormatter.format(new Date(u.createdAt))}
									</td>
									<td className='px-4 py-2 text-right'>
										<Button
											variant='ghost'
											size='icon-sm'
											aria-label={`Edit ${u.name}`}
											onClick={() => onEdit?.(u)}>
											<PencilIcon />
										</Button>
									</td>
								</tr>
							))}
				</tbody>
			</table>
		</div>
	);
}
