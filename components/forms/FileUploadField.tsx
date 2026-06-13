import { useState, useCallback, useRef } from "react";
import { IconCheck, IconUpload, IconX } from "../ui/icons";

interface UploadedFile {
	key: string;
	name: string;
	previewUrl: string | null;
}

interface FileUploadFieldProps {
	label: string;
	accept?: string;
	maxSizeMB?: number;
	tournamentId: string;
	registrationId: string;
	category: "photos" | "videos" | "documents";
	onUploadComplete: (key: string) => void;
	onUploadRemove?: (key: string) => void;
	multiple?: boolean;
	hint?: string;
	hasError?: boolean;
}

export function FileUploadField({
	label,
	accept,
	maxSizeMB = 5,
	tournamentId,
	registrationId,
	category,
	onUploadComplete,
	onUploadRemove,
	multiple = false,
	hint,
	hasError,
}: FileUploadFieldProps) {
	const [uploading, setUploading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [uploaded, setUploaded] = useState<UploadedFile[]>([]);
	const inputRef = useRef<HTMLInputElement>(null);

	const isPhoto = category === "photos";

	const handleUpload = useCallback(
		async (e: React.ChangeEvent<HTMLInputElement>) => {
			const files = e.target.files;
			if (!files || files.length === 0) return;

			const file = files[0];
			setError(null);

			if (file.size > maxSizeMB * 1024 * 1024) {
				setError(`ไฟล์ใหญ่เกิน ${maxSizeMB}MB`);
				return;
			}

			// Generate local preview URL for images
			const previewUrl = isPhoto && file.type.startsWith("image/")
				? URL.createObjectURL(file)
				: null;

			setUploading(true);
			try {
				const formData = new FormData();
				formData.append("file", file);
				formData.append("tournamentId", tournamentId);
				formData.append("registrationId", registrationId);
				formData.append("category", category);

				const res = await fetch("/api/upload", {
					method: "POST",
					body: formData,
				});

				if (!res.ok) {
					const data = await res.json();
					if (previewUrl) URL.revokeObjectURL(previewUrl);
					throw new Error(data.error || "Upload failed");
				}

				const data = await res.json();
				const newFile: UploadedFile = { key: data.key, name: file.name, previewUrl };

				if (!multiple) {
					// Revoke old preview if replacing
					setUploaded(prev => {
						prev.forEach(f => { if (f.previewUrl) URL.revokeObjectURL(f.previewUrl); });
						return [newFile];
					});
				} else {
					setUploaded(prev => [...prev, newFile]);
				}

				onUploadComplete(data.key);
			} catch (err: any) {
				setError(err.message || "Upload failed");
			} finally {
				setUploading(false);
				// Reset input so same file can be re-selected
				if (inputRef.current) inputRef.current.value = "";
			}
		},
		[tournamentId, registrationId, category, maxSizeMB, multiple, isPhoto, onUploadComplete],
	);

	const handleRemove = (key: string) => {
		setUploaded(prev => {
			const file = prev.find(f => f.key === key);
			if (file?.previewUrl) URL.revokeObjectURL(file.previewUrl);
			return prev.filter(f => f.key !== key);
		});
		onUploadRemove?.(key);
	};

	const showZone = multiple || uploaded.length === 0;

	return (
		<div className="mb-lg">
			<label className="label">{label}</label>
			{hint && (
				<p className="text-sm text-muted mb-xs mt-0.5">{hint}</p>
			)}

			{/* Previews */}
			{uploaded.length > 0 && (
				<div className={`flex flex-wrap gap-2 mb-2`}>
					{uploaded.map((f) => (
						<div key={f.key} className="relative group">
							{f.previewUrl ? (
								<div className="relative w-20 h-20 rounded-md overflow-hidden border border-hairline bg-surface-soft">
									<img
										src={f.previewUrl}
										alt={f.name}
										className="w-full h-full object-cover"
									/>
									<button
										type="button"
										onClick={() => handleRemove(f.key)}
										className="absolute top-0.5 right-0.5 w-6 h-6 rounded-full bg-ink/70 text-white flex items-center justify-center"
										title="ลบ"
									>
										<IconX size={10} color="white" />
									</button>
								</div>
							) : (
								<div className="flex items-center gap-1.5 px-2 py-1 rounded-md border border-hairline bg-surface-soft text-sm text-body">
									<IconCheck size={13} color="var(--color-success)" />
									<span className="max-w-[140px] truncate">{f.name}</span>
									<button
										type="button"
										onClick={() => handleRemove(f.key)}
										className="ml-1 text-muted hover:text-error transition-colors"
										title="ลบ"
									>
										<IconX size={12} />
									</button>
								</div>
							)}
						</div>
					))}
				</div>
			)}

			{/* Upload zone */}
			{showZone && (
				<div
					className="upload-zone"
					onClick={() => inputRef.current?.click()}
					style={{
						cursor: uploading ? "wait" : "pointer",
						...(hasError && uploaded.length === 0 ? { borderColor: "var(--color-error)" } : {}),
					}}
				>
					{uploading ? (
						<p className="text-muted m-0">กำลังอัพโหลด...</p>
					) : (
						<p className="text-muted flex items-center justify-center gap-1.5 m-0 text-base">
							<IconUpload size={16} /> {multiple ? "คลิกเพื่อเพิ่มไฟล์" : "คลิกเพื่อเลือกไฟล์"} (สูงสุด {maxSizeMB}MB)
						</p>
					)}
				</div>
			)}

			<input
				ref={inputRef}
				type="file"
				accept={accept}
				onChange={handleUpload}
				className="hidden"
				multiple={multiple}
			/>
			{error && (
				<p className="text-error text-sm mt-1">{error}</p>
			)}
		</div>
	);
}
