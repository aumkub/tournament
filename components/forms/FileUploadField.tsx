import { useState, useCallback, useRef } from "react";
import { IconCheck, IconUpload } from "../ui/icons";

interface FileUploadFieldProps {
	label: string;
	accept?: string;
	maxSizeMB?: number;
	tournamentId: string;
	registrationId: string;
	category: "photos" | "videos" | "documents";
	onUploadComplete: (key: string) => void;
	multiple?: boolean;
	hint?: string;
}

export function FileUploadField({
	label,
	accept,
	maxSizeMB = 5,
	tournamentId,
	registrationId,
	category,
	onUploadComplete,
	multiple = false,
	hint,
}: FileUploadFieldProps) {
	const [uploading, setUploading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [fileName, setFileName] = useState<string | null>(null);
	const inputRef = useRef<HTMLInputElement>(null);

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
					throw new Error(data.error || "Upload failed");
				}

				const data = await res.json();
				setFileName(file.name);
				onUploadComplete(data.key);
			} catch (err: any) {
				setError(err.message || "Upload failed");
			} finally {
				setUploading(false);
			}
		},
		[tournamentId, registrationId, category, maxSizeMB, onUploadComplete],
	);

	return (
		<div className="mb-lg">
			<label className="label">{label}</label>
			{hint && (
				<p className="text-xs text-muted mb-xs mt-0.5">
					{hint}
				</p>
			)}
			<div
				className="upload-zone"
				onClick={() => inputRef.current?.click()}
				style={{ cursor: uploading ? "wait" : "pointer" }}
			>
				{uploading ? (
					<p className="text-muted">กำลังอัพโหลด...</p>
				) : fileName ? (
					<p className="text-success flex items-center justify-center gap-1.5">
						<IconCheck size={16} color="var(--color-success)" /> {fileName}
					</p>
				) : (
					<p className="text-muted flex items-center justify-center gap-1.5">
						<IconUpload size={16} /> คลิกเพื่อเลือกไฟล์ (สูงสุด {maxSizeMB}MB)
					</p>
				)}
			</div>
			<input
				ref={inputRef}
				type="file"
				accept={accept}
				onChange={handleUpload}
				className="hidden"
				multiple={multiple}
			/>
			{error && (
				<p className="text-error text-xs mt-1">
					{error}
				</p>
			)}
		</div>
	);
}