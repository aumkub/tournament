import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { useEffect } from "react";

interface TiptapEditorProps {
	value: string;
	onChange: (html: string) => void;
	placeholder?: string;
}

export function TiptapEditor({ value, onChange, placeholder }: TiptapEditorProps) {
	const editor = useEditor({
		extensions: [StarterKit],
		content: value || "",
		onUpdate: ({ editor }) => {
			const html = editor.isEmpty ? "" : editor.getHTML();
			onChange(html);
		},
		editorProps: {
			attributes: {
				class: "tiptap-content focus:outline-none min-h-[120px] px-3 py-2.5 text-sm text-ink",
			},
		},
	});

	// Sync external value changes (e.g. reset)
	useEffect(() => {
		if (!editor) return;
		const current = editor.isEmpty ? "" : editor.getHTML();
		if (current !== value) {
			editor.commands.setContent(value || "", false);
		}
	}, [value, editor]);

	const btn = (label: string, action: () => boolean, active?: boolean) => (
		<button
			type="button"
			onMouseDown={(e) => { e.preventDefault(); action(); }}
			style={{
				padding: "3px 8px",
				fontSize: 13,
				fontWeight: active ? 700 : 400,
				background: active ? "var(--color-surface-soft)" : "transparent",
				border: "none",
				borderRadius: 4,
				cursor: "pointer",
				color: active ? "var(--color-primary)" : "var(--color-body)",
				lineHeight: 1.4,
			}}
		>
			{label}
		</button>
	);

	return (
		<div
			style={{
				border: "1px solid var(--color-border)",
				borderRadius: "var(--radius-md)",
				overflow: "hidden",
				background: "var(--color-canvas)",
			}}
		>
			{/* Toolbar */}
			<div
				style={{
					display: "flex",
					alignItems: "center",
					gap: 2,
					padding: "4px 8px",
					borderBottom: "1px solid var(--color-border)",
					background: "var(--color-surface-soft)",
					flexWrap: "wrap",
				}}
			>
				{btn("B", () => editor!.chain().focus().toggleBold().run(), editor?.isActive("bold"))}
				{btn("I", () => editor!.chain().focus().toggleItalic().run(), editor?.isActive("italic"))}
				{btn("S", () => editor!.chain().focus().toggleStrike().run(), editor?.isActive("strike"))}
				<div style={{ width: 1, height: 16, background: "var(--color-hairline)", margin: "0 4px" }} />
				{btn("H2", () => editor!.chain().focus().toggleHeading({ level: 2 }).run(), editor?.isActive("heading", { level: 2 }))}
				{btn("H3", () => editor!.chain().focus().toggleHeading({ level: 3 }).run(), editor?.isActive("heading", { level: 3 }))}
				<div style={{ width: 1, height: 16, background: "var(--color-hairline)", margin: "0 4px" }} />
				{btn("• List", () => editor!.chain().focus().toggleBulletList().run(), editor?.isActive("bulletList"))}
				{btn("1. List", () => editor!.chain().focus().toggleOrderedList().run(), editor?.isActive("orderedList"))}
				<div style={{ width: 1, height: 16, background: "var(--color-hairline)", margin: "0 4px" }} />
				{btn("¶", () => editor!.chain().focus().setParagraph().run(), editor?.isActive("paragraph"))}
				{btn("—", () => { editor!.chain().focus().setHorizontalRule().run(); return true; })}
				{editor && !editor.isEmpty && (
					<>
						<div style={{ flex: 1 }} />
						{btn("Clear", () => { editor.commands.clearContent(true); return true; })}
					</>
				)}
			</div>

			{/* Editor area */}
			<EditorContent editor={editor} />

			{/* Placeholder */}
			{editor?.isEmpty && placeholder && (
				<div
					style={{
						position: "absolute",
						pointerEvents: "none",
						color: "var(--color-muted)",
						fontSize: 13,
						padding: "10px 12px",
					}}
				>
					{placeholder}
				</div>
			)}
		</div>
	);
}
