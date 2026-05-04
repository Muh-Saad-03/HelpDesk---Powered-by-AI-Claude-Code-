/** @format */

import { Skeleton } from "@/components/ui/skeleton";

export function TicketDetailSkeleton() {
	return (
		<div className='space-y-3'>
			<Skeleton className='h-20 w-full' />
			<Skeleton className='h-20 w-full' />
		</div>
	);
}
