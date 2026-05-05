/** @format */

import { PencilIcon, TrashIcon } from "lucide-react";
import { Role } from "core";
import { Skeleton } from "@/components/ui/skeleton";

export type User = {
	id: string;
	name: string;
	email: string;
	role: Role;
	createdAt: string;
};

type Props = {
	users: User[] | undefined;
	onEdit?: (user: User) => void;
	onDelete?: (user: User) => void;
};

const dateFormatter = new Intl.DateTimeFormat(undefined, {
	dateStyle: "medium",
});

const SKELETON_ROW_COUNT = 5;

export function UsersTable({ users, onEdit, onDelete }: Props) {
	const isLoading = users === undefined;

	return (
		<div className='overflow-x-auto'>
			<table className='w-full text-sm'>
				<thead className='text-left'>
					<tr className='border-b hairline bg-surface-2/40'>
						<th className='px-4 py-2.5 font-mono text-[10px] tracking-widest uppercase text-muted-foreground'>
							Name
						</th>
						<th className='px-4 py-2.5 font-mono text-[10px] tracking-widest uppercase text-muted-foreground'>
							Email
						</th>
						<th className='px-4 py-2.5 font-mono text-[10px] tracking-widest uppercase text-muted-foreground'>
							Role
						</th>
						<th className='px-4 py-2.5 font-mono text-[10px] tracking-widest uppercase text-muted-foreground'>
							Created
						</th>
						<th className='w-px px-4 py-2.5 font-mono text-[10px] tracking-widest uppercase text-muted-foreground'>
							Actions
						</th>
					</tr>
				</thead>
				<tbody>
					{isLoading
						? Array.from({ length: SKELETON_ROW_COUNT }).map((_, i) => (
								<tr key={i} className='border-t hairline'>
									<td className='px-4 py-3'>
										<Skeleton className='h-4 w-32' />
									</td>
									<td className='px-4 py-3'>
										<Skeleton className='h-4 w-48' />
									</td>
									<td className='px-4 py-3'>
										<Skeleton className='h-3 w-16' />
									</td>
									<td className='px-4 py-3'>
										<Skeleton className='h-3 w-24' />
									</td>
									<td className='px-4 py-3'>
										<Skeleton className='h-7 w-7 rounded-md' />
									</td>
								</tr>
							))
						: users.map((u, idx) => {
								const initials = u.name
									.split(" ")
									.map((s) => s[0])
									.filter(Boolean)
									.slice(0, 2)
									.join("")
									.toUpperCase();
								const isAdmin = u.role === Role.ADMIN;
								return (
									<tr
										key={u.id}
										className={
											"group/row border-t hairline transition-colors hover:bg-surface-2/60 " +
											(idx % 2 === 1 ? "bg-surface-2/20" : "")
										}>
										<td className='px-4 py-3'>
											<div className='flex items-center gap-2.5'>
												<div className='grid size-7 place-items-center rounded-full bg-muted font-mono text-[10px] font-semibold tracking-wide text-foreground'>
													{initials}
												</div>
												<span className='text-[13px] font-medium'>
													{u.name}
												</span>
											</div>
										</td>
										<td className='px-4 py-3 font-mono text-[12px] text-muted-foreground'>
											{u.email}
										</td>
										<td className='px-4 py-3'>
											<span className='inline-flex items-center gap-2 whitespace-nowrap font-mono text-[10px] tracking-widest uppercase'>
												<span
													aria-hidden
													className={
														"status-dot bg-current " +
														(isAdmin
															? "text-status-resolved"
															: "text-status-closed")
													}
												/>
												<span>{u.role.toLowerCase()}</span>
											</span>
										</td>
										<td className='px-4 py-3 font-mono text-[11px] tabular-nums text-muted-foreground'>
											{dateFormatter.format(new Date(u.createdAt))}
										</td>
										<td className='px-4 py-3'>
											<div className='flex items-center justify-end gap-1 opacity-60 transition-opacity group-hover/row:opacity-100'>
												<button
													type='button'
													aria-label={`Edit ${u.name}`}
													onClick={() => onEdit?.(u)}
													className='grid size-7 place-items-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground'>
													<PencilIcon className='size-3.5' />
												</button>
												{u.role !== Role.ADMIN && (
													<button
														type='button'
														aria-label={`Delete ${u.name}`}
														onClick={() => onDelete?.(u)}
														className='grid size-7 place-items-center rounded-md text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive'>
														<TrashIcon className='size-3.5' />
													</button>
												)}
											</div>
										</td>
									</tr>
								);
							})}
				</tbody>
			</table>
		</div>
	);
}
