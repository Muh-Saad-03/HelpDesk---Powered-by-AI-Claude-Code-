/** @format */

import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { createUserSchema, type CreateUserInput } from "core";
import axios, { AxiosError } from "axios";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import {
	Field,
	FieldError,
	FieldGroup,
	FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";

type Props = {
	open: boolean;
	onOpenChange: (open: boolean) => void;
};

export function CreateUserDialog({ open, onOpenChange }: Props) {
	const queryClient = useQueryClient();
	const [apiError, setApiError] = useState<string | null>(null);

	const { control, handleSubmit, reset } = useForm<CreateUserInput>({
		resolver: zodResolver(createUserSchema),
		defaultValues: { name: "", email: "", password: "" },
		mode: "onChange",
	});

	const mutation = useMutation({
		mutationFn: (input: CreateUserInput) =>
			axios.post("/api/users", input, { withCredentials: true }),
		onSuccess: async () => {
			await queryClient.invalidateQueries({ queryKey: ["users"] });
			reset();
			setApiError(null);
			onOpenChange(false);
		},
		onError: (err: AxiosError<{ error?: string }>) => {
			setApiError(err.response?.data?.error ?? "Failed to create user");
		},
	});

	const onSubmit = handleSubmit((values) => {
		setApiError(null);
		mutation.mutate(values);
	});

	function handleOpenChange(next: boolean) {
		if (!next) {
			reset();
			setApiError(null);
		}
		onOpenChange(next);
	}

	return (
		<Dialog
			open={open}
			onOpenChange={handleOpenChange}>
			<DialogContent>
				<form
					onSubmit={onSubmit}
					noValidate>
					<DialogHeader>
						<DialogTitle>New User</DialogTitle>
						<DialogDescription>
							Create a new agent account. The new user can sign in immediately
							with the email and password you set.
						</DialogDescription>
					</DialogHeader>

					<div className='py-4'>
						<FieldGroup>
							<Controller
								name='name'
								control={control}
								render={({ field, fieldState }) => (
									<Field data-invalid={fieldState.invalid}>
										<FieldLabel htmlFor='create-user-name'>Name</FieldLabel>
										<Input
											{...field}
											id='create-user-name'
											autoComplete='name'
											placeholder='Full Name'
											aria-invalid={fieldState.invalid}
										/>
										{fieldState.invalid && (
											<FieldError errors={[fieldState.error]} />
										)}
									</Field>
								)}
							/>
							<Controller
								name='email'
								control={control}
								render={({ field, fieldState }) => (
									<Field data-invalid={fieldState.invalid}>
										<FieldLabel htmlFor='create-user-email'>Email</FieldLabel>
										<Input
											{...field}
											id='create-user-email'
											type='email'
											autoComplete='off'
											placeholder='person@example.com'
											aria-invalid={fieldState.invalid}
										/>
										{fieldState.invalid && (
											<FieldError errors={[fieldState.error]} />
										)}
									</Field>
								)}
							/>
							<Controller
								name='password'
								control={control}
								render={({ field, fieldState }) => (
									<Field data-invalid={fieldState.invalid}>
										<FieldLabel htmlFor='create-user-password'>
											Password
										</FieldLabel>
										<Input
											{...field}
											id='create-user-password'
											type='password'
											autoComplete='new-password'
											placeholder='Minimum of 8 characters'
											aria-invalid={fieldState.invalid}
										/>
										{fieldState.invalid && (
											<FieldError errors={[fieldState.error]} />
										)}
									</Field>
								)}
							/>
							{apiError && (
								<Alert variant='destructive'>
									<AlertDescription>{apiError}</AlertDescription>
								</Alert>
							)}
						</FieldGroup>
					</div>

					<DialogFooter>
						<Button
							type='button'
							variant='outline'
							onClick={() => handleOpenChange(false)}
							disabled={mutation.isPending}>
							Cancel
						</Button>
						<Button
							type='submit'
							disabled={mutation.isPending}>
							{mutation.isPending ? "Creating..." : "Create user"}
						</Button>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	);
}
