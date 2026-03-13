import * as Dialog from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import type { ReactNode } from "react";

interface ModalProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	title: string;
	children: ReactNode;
}

export function Modal({ open, onOpenChange, title, children }: ModalProps) {
	return (
		<Dialog.Root open={open} onOpenChange={onOpenChange}>
			<Dialog.Portal>
				<Dialog.Overlay className="fixed inset-0 z-50 bg-black/40 data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=closed]:animate-out data-[state=closed]:fade-out-0" />
				<Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-full max-w-lg -translate-x-1/2 -translate-y-1/2 rounded-2xl bg-(--surface) p-6 shadow-lg text-(--sea-ink) data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95">
					<div className="mb-4 flex items-center justify-between">
						<Dialog.Title className="text-lg font-bold">{title}</Dialog.Title>
						<Dialog.Close
							aria-label="Close"
							className="rounded-lg p-1.5 text-(--sea-ink-soft) transition hover:bg-(--line)"
						>
							<X size={18} />
						</Dialog.Close>
					</div>
					{children}
				</Dialog.Content>
			</Dialog.Portal>
		</Dialog.Root>
	);
}
