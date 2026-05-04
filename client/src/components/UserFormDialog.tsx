/** @format */

import { useEffect, useRef, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
	createUserSchema,
	updateUserSchema,
	type CreateUserInput,
} from "core";
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

export type EditingUser = { id: string; name: string; email: string };

export type UserFormDialogState =
	| null
	| { mode: "create" }
	| { mode: "edit"; user: EditingUser };

type Props = {
	state: UserFormDialogState;
	onClose: () => void;
};

const emptyDefaults: CreateUserInput = { name: "", email: "", password: "" };

function defaultsFor(user: EditingUser | undefined): CreateUserInput {
	if (!user) return emptyDefaults;
	return { name: user.name, email: user.email, password: "" };
}

function userFromState(
	state: UserFormDialogState,
): EditingUser | undefined {
	return state?.mode === "edit" ? state.user : undefined;
}

export function UserFormDialog({ state, onClose }: Props) {
	const open = state !== null;
	const user = userFromState(state);
	const isEdit = user !== undefined;
	const queryClient = useQueryClient();
	const [apiError, setApiError] = useState<string | null>(null);

	const { control, handleSubmit, reset } = useForm<CreateUserInput>({
		resolver: zodResolver(isEdit ? updateUserSchema : createUserSchema),
		defaultValues: defaultsFor(user),
		mode: "onChange",
	});

	// Repopulate when the edit target changes (e.g. admin clicks Edit on a
	// different row without closing the dialog first). Tracking the previous id
	// in a ref avoids re-firing on unrelated re-renders (every keystroke would
	// otherwise reset the form back to the user's stored values).
	const prevUserIdRef = useRef<string | undefined>(user?.id);
	useEffect(() => {
		if (prevUserIdRef.current !== user?.id) {
			prevUserIdRef.current = user?.id;
			reset(defaultsFor(user));
		}
	}, [user, reset]);

	const mutation = useMutation({
		mutationFn: (input: CreateUserInput) =>
			isEdit
				? axios.patch(`/api/users/${user.id}`, input, {
						withCredentials: true,
					})
				: axios.post("/api/users", input, { withCredentials: true }),
		onSuccess: async () => {
			await queryClient.invalidateQueries({ queryKey: ["users"] });
			reset(emptyDefaults);
			setApiError(null);
			onClose();
		},
		onError: (err: AxiosError<{ error?: string }>) => {
			setApiError(
				err.response?.data?.error ??
					(isEdit ? "Failed to update user" : "Failed to create user"),
			);
		},
	});

	const onSubmit = handleSubmit((values) => {
		setApiError(null);
		mutation.mutate(values);
	});

	function handleOpenChange(next: boolean) {
		if (!next) {
			reset(emptyDefaults);
			setApiError(null);
			onClose();
		}
	}

	const title = isEdit ? "Edit User" : "New User";
	const description = isEdit
		? "Update this user's name, email, or password. Leave the password blank to keep it unchanged."
		: "Create a new agent account. The new user can sign in immediately with the email and password you set.";
	const submitLabel = isEdit ? "Save changes" : "Create user";
	const submittingLabel = isEdit ? "Saving..." : "Creating...";
	const passwordPlaceholder = isEdit
		? "Leave blank to keep current password"
		: "Minimum of 8 characters";

	return (
		<Dialog
			open={open}
			onOpenChange={handleOpenChange}>
			<DialogContent>
				<form
					onSubmit={onSubmit}
					noValidate>
					<DialogHeader>
						<DialogTitle>{title}</DialogTitle>
						<DialogDescription>{description}</DialogDescription>
					</DialogHeader>

					<div className='py-4'>
						<FieldGroup>
							<Controller
								name='name'
								control={control}
								render={({ field, fieldState }) => (
									<Field data-invalid={fieldState.invalid}>
										<FieldLabel htmlFor='user-form-name'>Name</FieldLabel>
										<Input
											{...field}
											id='user-form-name'
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
										<FieldLabel htmlFor='user-form-email'>Email</FieldLabel>
										<Input
											{...field}
											id='user-form-email'
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
										<FieldLabel htmlFor='user-form-password'>
											Password
										</FieldLabel>
										<Input
											{...field}
											id='user-form-password'
											type='password'
											autoComplete='new-password'
											placeholder={passwordPlaceholder}
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
							{mutation.isPending ? submittingLabel : submitLabel}
						</Button>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	);
}
