import { ImagePlus, Link, Loader2, Trash2, Upload } from "lucide-react";
import { type ChangeEvent, useRef, useState } from "react";

interface ImageInputProps {
	value: string | null;
	onChange: (url: string | null) => void;
}

export function ImageInput({ value, onChange }: ImageInputProps) {
	const fileRef = useRef<HTMLInputElement>(null);
	const [urlInput, setUrlInput] = useState("");
	const [uploading, setUploading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [mode, setMode] = useState<"upload" | "url">("upload");

	async function handleFileChange(e: ChangeEvent<HTMLInputElement>) {
		const file = e.target.files?.[0];
		if (!file) return;

		setError(null);
		setUploading(true);
		try {
			const formData = new FormData();
			formData.append("file", file);
			const res = await fetch("/api/uploads", {
				method: "POST",
				body: formData,
			});
			const data = await res.json();
			if (!res.ok) {
				setError(data.error || "Upload failed");
				return;
			}
			onChange(data.url);
		} catch {
			setError("Upload failed");
		} finally {
			setUploading(false);
			if (fileRef.current) fileRef.current.value = "";
		}
	}

	async function handleUrlDownload() {
		if (!urlInput.trim()) return;

		setError(null);
		setUploading(true);
		try {
			const res = await fetch("/api/uploads", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ url: urlInput.trim() }),
			});
			const data = await res.json();
			if (!res.ok) {
				setError(data.error || "Download failed");
				return;
			}
			onChange(data.url);
			setUrlInput("");
		} catch {
			setError("Download failed");
		} finally {
			setUploading(false);
		}
	}

	if (value) {
		return (
			<div className="flex flex-col gap-1.5">
				<span className="text-sm font-medium text-(--sea-ink)">Image</span>
				<div className="relative w-fit">
					<img
						src={value}
						alt="Preview"
						className="h-32 w-32 rounded-lg border border-(--line) object-cover"
					/>
					<button
						type="button"
						onClick={() => onChange(null)}
						className="absolute -right-2 -top-2 rounded-full bg-red-600 p-1 text-white shadow transition hover:bg-red-700"
					>
						<Trash2 size={12} />
					</button>
				</div>
			</div>
		);
	}

	return (
		<div className="flex flex-col gap-1.5">
			<span className="text-sm font-medium text-(--sea-ink)">Image</span>

			<div className="flex gap-1 text-xs">
				<button
					type="button"
					onClick={() => setMode("upload")}
					className={`flex items-center gap-1 rounded-md px-2 py-1 transition ${mode === "upload" ? "bg-(--lagoon) text-white" : "text-(--sea-ink-soft) hover:bg-(--surface)"}`}
				>
					<Upload size={12} />
					Upload
				</button>
				<button
					type="button"
					onClick={() => setMode("url")}
					className={`flex items-center gap-1 rounded-md px-2 py-1 transition ${mode === "url" ? "bg-(--lagoon) text-white" : "text-(--sea-ink-soft) hover:bg-(--surface)"}`}
				>
					<Link size={12} />
					URL
				</button>
			</div>

			{mode === "upload" ? (
				<>
					<input
						ref={fileRef}
						type="file"
						accept="image/*"
						onChange={handleFileChange}
						className="hidden"
					/>
					<button
						type="button"
						onClick={() => fileRef.current?.click()}
						disabled={uploading}
						className="flex h-24 w-full items-center justify-center gap-2 rounded-lg border-2 border-dashed border-(--line) text-sm text-(--sea-ink-soft) transition hover:border-(--lagoon) hover:text-(--lagoon-deep) disabled:opacity-50"
					>
						{uploading ? (
							<Loader2 size={18} className="animate-spin" />
						) : (
							<>
								<ImagePlus size={18} />
								Choose image
							</>
						)}
					</button>
				</>
			) : (
				<div className="flex gap-2">
					<input
						type="text"
						value={urlInput}
						onChange={(e) => setUrlInput(e.target.value)}
						placeholder="https://example.com/image.jpg"
						className="h-10 flex-1 rounded-lg border border-(--line) bg-(--surface) px-3 text-sm text-(--sea-ink) outline-none focus:border-(--lagoon)"
					/>
					<button
						type="button"
						onClick={handleUrlDownload}
						disabled={uploading || !urlInput.trim()}
						className="h-10 rounded-lg bg-(--lagoon) px-3 text-sm font-medium text-white transition hover:opacity-90 disabled:opacity-50"
					>
						{uploading ? (
							<Loader2 size={16} className="animate-spin" />
						) : (
							"Download"
						)}
					</button>
				</div>
			)}

			{error && <p className="text-xs text-red-600">{error}</p>}
		</div>
	);
}
