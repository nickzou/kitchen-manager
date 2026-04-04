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

interface Toast {
	id: string;
	message: string;
	variant: ToastVariant;
}

interface ToastContextValue {
	addToast: (message: string, variant: ToastVariant) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast() {
	const ctx = useContext(ToastContext);
	if (!ctx) throw new Error("useToast must be used within ToastProvider");
	return {
		success: (message: string) => ctx.addToast(message, "success"),
		error: (message: string) => ctx.addToast(message, "error"),
	};
}

export function ToastProvider({ children }: { children: ReactNode }) {
	const [toasts, setToasts] = useState<Toast[]>([]);
	const timersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(
		new Map(),
	);

	const addToast = useCallback((message: string, variant: ToastVariant) => {
		const id = crypto.randomUUID();
		setToasts((prev) => [...prev, { id, message, variant }]);

		const timer = setTimeout(() => {
			setToasts((prev) => prev.filter((t) => t.id !== id));
			timersRef.current.delete(id);
		}, 3000);
		timersRef.current.set(id, timer);
	}, []);

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
						"w-full rounded-lg border px-4 py-3 text-sm font-medium shadow-lg sm:w-auto",
						"animate-in fade-in-0 slide-in-from-bottom-4",
						variantClasses[toast.variant],
					)}
				>
					{toast.message}
				</div>
			))}
		</div>
	);
}
