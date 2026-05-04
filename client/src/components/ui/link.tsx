import { forwardRef } from "react";
import { Link as RouterLink, type LinkProps } from "react-router-dom";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const linkVariants = cva("", {
	variants: {
		variant: {
			primary: "text-primary hover:underline",
			muted: "text-muted-foreground hover:text-foreground",
		},
	},
	defaultVariants: { variant: "primary" },
});

export type AppLinkProps = LinkProps & VariantProps<typeof linkVariants>;

export const Link = forwardRef<HTMLAnchorElement, AppLinkProps>(
	function Link({ className, variant, ...props }, ref) {
		return (
			<RouterLink
				ref={ref}
				className={cn(linkVariants({ variant }), className)}
				{...props}
			/>
		);
	},
);
