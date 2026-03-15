import { lazy, Suspense, useEffect, useState } from "react";

const MDEditor = lazy(() => import("@uiw/react-md-editor"));
const MDPreview = lazy(() =>
	import("@uiw/react-md-editor").then((mod) => ({
		default: mod.default.Markdown,
	})),
);

interface MarkdownEditorProps {
	value: string;
	onChange?: (value: string) => void;
	height?: number;
	className?: string;
	placeholder?: string;
}

function useColorMode(): "light" | "dark" {
	const [mode, setMode] = useState<"light" | "dark">(() =>
		document?.documentElement.classList.contains("dark") ? "dark" : "light",
	);

	useEffect(() => {
		const observer = new MutationObserver(() => {
			setMode(
				document.documentElement.classList.contains("dark") ? "dark" : "light",
			);
		});
		observer.observe(document.documentElement, {
			attributes: true,
			attributeFilter: ["class"],
		});
		return () => observer.disconnect();
	}, []);

	return mode;
}

export function MarkdownEditor({
	value,
	onChange,
	height = 200,
	className,
	placeholder,
}: MarkdownEditorProps) {
	const colorMode = useColorMode();
	const editable = onChange != null;

	if (!editable) {
		return (
			<div data-color-mode={colorMode} className={className}>
				<Suspense
					fallback={
						<p className="whitespace-pre-wrap text-sm text-(--sea-ink-soft)">
							{value}
						</p>
					}
				>
					<MDPreview source={value} style={{ whiteSpace: "pre-wrap" }} />
				</Suspense>
			</div>
		);
	}

	return (
		<div data-color-mode={colorMode} className={className}>
			<Suspense>
				<MDEditor
					value={value}
					onChange={(v) => onChange(v ?? "")}
					height={height}
					preview="edit"
					textareaProps={{ placeholder }}
				/>
			</Suspense>
		</div>
	);
}
