import type { Route } from "./+types/admin/site-settings";
import { parseCookie, verifySession, hasRole } from "../../../lib/kv-session";
import { getSiteSettings, type HeaderMode } from "../../../lib/site-settings";
import { useRef, useState } from "react";
import { IconSave, IconCheck, IconX, IconSettings, IconCamera } from "../../../components/ui/icons";

export async function loader({ request, context }: Route.LoaderArgs) {
	const env = context.cloudflare.env;
	const token = parseCookie(request.headers.get("Cookie"));
	const session = await verifySession(env.SESSIONS, token || "");
	if (!session || !hasRole(session, "super_admin")) {
		throw new Response("Unauthorized", { status: 401 });
	}

	const settings = await getSiteSettings(env.DB);
	return { settings };
}

export function meta() {
	return [{ title: "ตั้งค่าเว็บไซต์ — all Thailand" }];
}

export default function SiteSettingsPage({ loaderData }: Route.ComponentProps) {
	const [form, setForm] = useState(loaderData.settings);
	const [headerImageFile, setHeaderImageFile] = useState<File | null>(null);
	const [headerImagePreview, setHeaderImagePreview] = useState<string | null>(
		loaderData.settings.headerImageUrl,
	);
	const [removeHeaderImage, setRemoveHeaderImage] = useState(false);
	const headerImageInputRef = useRef<HTMLInputElement>(null);
	const [saving, setSaving] = useState(false);
	const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);

	const handleHeaderImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
		const file = e.target.files?.[0];
		if (!file) return;
		if (file.size > 2 * 1024 * 1024) {
			setMessage({ ok: false, text: "โลโก้ต้องไม่เกิน 2MB" });
			return;
		}
		if (!file.type.startsWith("image/")) {
			setMessage({ ok: false, text: "อัปโหลดได้เฉพาะไฟล์รูปภาพ" });
			return;
		}
		setHeaderImageFile(file);
		setRemoveHeaderImage(false);
		const reader = new FileReader();
		reader.onload = (ev) => setHeaderImagePreview(ev.target?.result as string);
		reader.readAsDataURL(file);
		setMessage(null);
	};

	const handleSave = async () => {
		setSaving(true);
		setMessage(null);
		try {
			const fd = new FormData();
			fd.append("header_mode", form.headerMode);
			fd.append("header_brand", form.headerBrand);
			fd.append("header_logo_letter", form.headerLogoLetter);
			fd.append("home_title", form.homeTitle);
			fd.append("home_description", form.homeDescription);
			fd.append("footer_line1", form.footerLine1);
			fd.append("footer_line2", form.footerLine2);
			fd.append("meta_title", form.metaTitle);
			fd.append("meta_description", form.metaDescription);
			if (headerImageFile) fd.append("header_image", headerImageFile);
			if (removeHeaderImage) fd.append("remove_header_image", "1");

			const res = await fetch("/api/admin/site-settings", {
				method: "PUT",
				body: fd,
			});
			const data = await res.json();
			if (!res.ok) throw new Error(data.error || "บันทึกไม่สำเร็จ");
			setForm(data.settings);
			setHeaderImageFile(null);
			setRemoveHeaderImage(false);
			setHeaderImagePreview(data.settings.headerImageUrl);
			setMessage({ ok: true, text: "บันทึกการตั้งค่าเรียบร้อยแล้ว" });
		} catch (err: unknown) {
			setMessage({ ok: false, text: err instanceof Error ? err.message : "บันทึกไม่สำเร็จ" });
		} finally {
			setSaving(false);
		}
	};

	const setHeaderMode = (mode: HeaderMode) => {
		setForm({ ...form, headerMode: mode });
		setMessage(null);
	};

	return (
		<div className="max-w-[720px] mx-auto px-lg py-xl">
			<div className="flex items-center gap-2 mb-xl">
				<IconSettings size={22} color="var(--color-muted)" />
				<div>
					<h1 className="!text-2xl m-0">ตั้งค่าเว็บไซต์</h1>
					<p className="text-sm text-muted m-0 mt-1">แก้ไข Header, หน้าแรก และ Footer</p>
				</div>
			</div>

			{message && (
				<div
					className={`flex items-center gap-2 p-md rounded-md text-sm mb-lg ${
						message.ok
							? "bg-[#f0fdf4] border border-[#86efac] text-[#166534]"
							: "bg-[#fef2f2] border border-error text-error"
					}`}
				>
					{message.ok ? <IconCheck size={16} /> : <IconX size={16} />}
					{message.text}
				</div>
			)}

			<div className="card mb-lg">
				<h2 className="!text-lg mb-md">Header</h2>
				<p className="text-sm text-muted mt-0 mb-md">เลือกแสดงโลโก้เป็นข้อความหรือรูปภาพ</p>

				<div className="flex gap-sm mb-lg">
					<button
						type="button"
						className={`btn ${form.headerMode === "text" ? "btn-primary" : "btn-secondary"}`}
						onClick={() => setHeaderMode("text")}
					>
						ข้อความ
					</button>
					<button
						type="button"
						className={`btn ${form.headerMode === "image" ? "btn-primary" : "btn-secondary"}`}
						onClick={() => setHeaderMode("image")}
					>
						รูปภาพ
					</button>
				</div>

				{form.headerMode === "text" ? (
					<div className="grid gap-md sm:grid-cols-2">
						<div>
							<label className="label">ชื่อแบรนด์</label>
							<input
								className="input w-full"
								value={form.headerBrand}
								onChange={(e) => setForm({ ...form, headerBrand: e.target.value })}
								placeholder="all Thailand"
							/>
						</div>
						<div>
							<label className="label">ตัวอักษรโลโก้</label>
							<input
								className="input w-full"
								maxLength={2}
								value={form.headerLogoLetter}
								onChange={(e) => setForm({ ...form, headerLogoLetter: e.target.value })}
								placeholder="T"
							/>
						</div>
					</div>
				) : (
					<div className="grid gap-md">
						<div>
							<label className="label">รูปโลโก้</label>
							<input
								ref={headerImageInputRef}
								type="file"
								accept="image/*"
								className="hidden"
								onChange={handleHeaderImageSelect}
							/>
							<div
								className="relative flex items-center justify-center rounded-md border border-dashed border-hairline overflow-hidden cursor-pointer"
								style={{ minHeight: 120, background: "var(--color-surface-soft)" }}
								onClick={() => headerImageInputRef.current?.click()}
							>
								{headerImagePreview ? (
									<img
										src={headerImagePreview}
										alt="ตัวอย่างโลโก้"
										className="max-h-24 max-w-full object-contain p-md"
									/>
								) : (
									<div className="flex flex-col items-center gap-2 py-lg text-muted">
										<IconCamera size={28} />
										<span className="text-sm">คลิกเพื่ออัปโหลดโลโก้ (PNG, JPG, SVG — สูงสุด 2MB)</span>
									</div>
								)}
							</div>
						</div>
						<div>
							<label className="label">ข้อความ alt (สำหรับ accessibility)</label>
							<input
								className="input w-full"
								value={form.headerBrand}
								onChange={(e) => setForm({ ...form, headerBrand: e.target.value })}
								placeholder="all Thailand"
							/>
						</div>
						{(headerImagePreview || form.headerImageKey) && (
							<button
								type="button"
								className="btn btn-secondary self-start"
								onClick={() => {
									setHeaderImageFile(null);
									setHeaderImagePreview(null);
									setRemoveHeaderImage(true);
									if (headerImageInputRef.current) headerImageInputRef.current.value = "";
								}}
							>
								ลบรูปโลโก้
							</button>
						)}
					</div>
				)}
			</div>

			<div className="card mb-lg">
				<h2 className="!text-lg mb-md">หน้าแรก — Title & Description</h2>
				<div className="grid gap-md">
					<div>
						<label className="label">หัวข้อหลัก (Title)</label>
						<input
							className="input w-full"
							value={form.homeTitle}
							onChange={(e) => setForm({ ...form, homeTitle: e.target.value })}
							placeholder="Registration System"
						/>
					</div>
					<div>
						<label className="label">คำอธิบาย (Description)</label>
						<textarea
							className="input w-full min-h-[120px] resize-y"
							value={form.homeDescription}
							onChange={(e) => setForm({ ...form, homeDescription: e.target.value })}
							placeholder="คำอธิบายหน้าแรก (ขึ้นบรรทัดใหม่ได้)"
						/>
						<p className="text-xs text-muted mt-1">ขึ้นบรรทัดใหม่จะแสดงเป็นย่อหน้าแยกบนหน้าแรก</p>
					</div>
				</div>
			</div>

			<div className="card mb-lg">
				<h2 className="!text-lg mb-md">Footer</h2>
				<div className="grid gap-md">
					<div>
						<label className="label">บรรทัดที่ 1</label>
						<input
							className="input w-full"
							value={form.footerLine1}
							onChange={(e) => setForm({ ...form, footerLine1: e.target.value })}
						/>
					</div>
					<div>
						<label className="label">บรรทัดที่ 2</label>
						<input
							className="input w-full"
							value={form.footerLine2}
							onChange={(e) => setForm({ ...form, footerLine2: e.target.value })}
						/>
					</div>
				</div>
			</div>

			<div className="card mb-lg">
				<h2 className="!text-lg mb-md">SEO (Meta)</h2>
				<div className="grid gap-md">
					<div>
						<label className="label">Meta Title</label>
						<input
							className="input w-full"
							value={form.metaTitle}
							onChange={(e) => setForm({ ...form, metaTitle: e.target.value })}
						/>
					</div>
					<div>
						<label className="label">Meta Description</label>
						<textarea
							className="input w-full min-h-[80px] resize-y"
							value={form.metaDescription}
							onChange={(e) => setForm({ ...form, metaDescription: e.target.value })}
						/>
					</div>
				</div>
			</div>

			<div className="flex gap-sm">
				<button className="btn btn-primary" onClick={handleSave} disabled={saving}>
					<IconSave size={16} />
					{saving ? "กำลังบันทึก..." : "บันทึกการตั้งค่า"}
				</button>
				<a href="/" className="btn btn-secondary no-underline">
					ดูหน้าแรก
				</a>
				<a href="/portal" className="btn btn-secondary no-underline">
					กลับ Portal
				</a>
			</div>
		</div>
	);
}
