import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

export interface UserSettings {
	id: string;
	userId: string;
	advancedMode: boolean;
	apiEnabled: boolean;
	webhooksEnabled: boolean;
	nutritionEnabled: boolean;
	weekStartDay: number;
	createdAt: string;
	updatedAt: string;
}

export type UpdateUserSettingsInput = Partial<
	Pick<
		UserSettings,
		| "advancedMode"
		| "apiEnabled"
		| "webhooksEnabled"
		| "nutritionEnabled"
		| "weekStartDay"
	>
>;

export function useUserSettings() {
	return useQuery<UserSettings>({
		queryKey: ["userSettings"],
		queryFn: async () => {
			const res = await fetch("/api/user-settings");
			if (!res.ok) throw new Error("Failed to fetch user settings");
			return res.json();
		},
	});
}

export function useUpdateUserSettings() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: async (input: UpdateUserSettingsInput) => {
			const res = await fetch("/api/user-settings", {
				method: "PUT",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(input),
			});
			if (!res.ok) throw new Error("Failed to update user settings");
			return res.json() as Promise<UserSettings>;
		},
		onMutate: async (input) => {
			await queryClient.cancelQueries({ queryKey: ["userSettings"] });
			const previous = queryClient.getQueryData<UserSettings>(["userSettings"]);
			if (previous) {
				queryClient.setQueryData<UserSettings>(["userSettings"], {
					...previous,
					...input,
				});
			}
			return { previous };
		},
		onError: (_err, _input, context) => {
			if (context?.previous) {
				queryClient.setQueryData(["userSettings"], context.previous);
			}
		},
		onSettled: () => {
			queryClient.invalidateQueries({ queryKey: ["userSettings"] });
		},
	});
}
