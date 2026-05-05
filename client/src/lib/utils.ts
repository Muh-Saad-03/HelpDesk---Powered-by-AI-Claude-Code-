import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Native <select> styled to match the rest of the form inputs (Input/Button).
// Shared so the filter selects on TicketsPage and the inline edit selects on
// the detail page don't drift apart.
export const SELECT_CLASS =
  "h-8 rounded-md border hairline bg-surface px-2 pr-7 text-[13px] outline-none transition-colors hover:border-foreground/30 focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/30 disabled:opacity-50 appearance-none bg-no-repeat bg-[right_0.5rem_center] bg-[length:0.65rem] bg-[image:url('data:image/svg+xml;utf8,<svg%20xmlns=%22http://www.w3.org/2000/svg%22%20viewBox=%220%200%2010%2010%22%20fill=%22none%22%20stroke=%22currentColor%22%20stroke-width=%221.5%22%20stroke-linecap=%22round%22><path%20d=%22M2%204l3%203%203-3%22/></svg>')]"
