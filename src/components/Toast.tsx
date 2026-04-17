import {
	createContext,
	type ReactNode,
	useCallback,
	useContext,
	useEffect,
	useRef,
	useState,
} from "react";
import { cn } from "#src/lib/utils";

type ToastVariant = "success" | "error";

interface ToastAction {
	label: string;
	onClick: () => void;
}

interface Toast {
	id: string;
	message: string;
	variant: ToastVariant;
	action?: ToastAction;
}

interface ToastContextValue {
	addToast: (
		message: string,
		variant: ToastVariant,
		action?: ToastAction,
	) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast() {
	const ctx = useContext(ToastContext);
	if (!ctx) throw new Error("useToast must be used within ToastProvider");
	return {
		success: (message: string, action?: ToastAction) =>
			ctx.addToast(message, "success", action),
		error: (message: string) => ctx.addToast(message, "error"),
	};
}

export function ToastProvider({ children }: { children: ReactNode }) {
	const [toasts, setToasts] = useState<Toast[]>([]);
	const timersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(
		new Map(),
	);

	const removeToast = useCallback((id: string) => {
		setToasts((prev) => prev.filter((t) => t.id !== id));
		const timer = timersRef.current.get(id);
		if (timer) {
			clearTimeout(timer);
			timersRef.current.delete(id);
		}
	}, []);

	const addToast = useCallback(
		(message: string, variant: ToastVariant, action?: ToastAction) => {
			const id = crypto.randomUUID();
			const wrappedAction = action
				? {
						label: action.label,
						onClick: () => {
							action.onClick();
							removeToast(id);
						},
					}
				: undefined;
			setToasts((prev) => [
				...prev,
				{ id, message, variant, action: wrappedAction },
			]);

			const timer = setTimeout(() => {
				setToasts((prev) => prev.filter((t) => t.id !== id));
				timersRef.current.delete(id);
			}, 3000);
			timersRef.current.set(id, timer);
		},
		[removeToast],
	);

	useEffect(() => {
		const timers = timersRef.current;
		return () => {
			for (const timer of timers.values()) clearTimeout(timer);
		};
	}, []);

	return (
		<ToastContext.Provider value={{ addToast }}>
			{children}
			<ToastContainer toasts={toasts} />
		</ToastContext.Provider>
	);
}

const variantClasses = {
	success:
		"border-green-200 bg-green-50 text-green-700 dark:border-green-900 dark:bg-green-950/50 dark:text-green-300",
	error:
		"border-red-200 bg-red-50 text-red-700 dark:border-red-900 dark:bg-red-950/50 dark:text-red-300",
};

function ToastContainer({ toasts }: { toasts: Toast[] }) {
	if (toasts.length === 0) return null;

	return (
		<div className="fixed bottom-4 right-4 left-4 z-50 flex flex-col items-end gap-2 sm:left-auto sm:min-w-72">
			{toasts.map((toast) => (
				<div
					key={toast.id}
					className={cn(
						"flex w-full items-center gap-3 rounded-lg border px-4 py-3 text-sm font-medium shadow-lg sm:w-auto",
						"animate-in fade-in-0 slide-in-from-bottom-4",
						variantClasses[toast.variant],
					)}
				>
					<span>{toast.message}</span>
					{toast.action && (
						<button
							type="button"
							onClick={toast.action.onClick}
							className="shrink-0 underline underline-offset-2 opacity-80 hover:opacity-100"
						>
							{toast.action.label}
						</button>
					)}
				</div>
			))}
		</div>
	);
}
