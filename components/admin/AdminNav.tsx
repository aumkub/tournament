import { IconQrCode, IconSettings, IconDownload, IconLogOut, IconArrowLeft } from "../ui/icons";
import type { Role } from "../../types/registration";

type Props = {
	slug: string;
	name: string;
	role: Role;
	current: "dashboard" | "checkin" | "settings";
};

// Define font size system
const FONT_SIZE = {
	base: "text-base",
	sm: "text-sm",
	xs: "text-xs",
};

const navLinkBase = `inline-flex items-center gap-1.5 font-medium no-underline px-3 py-1.5 rounded-md transition-colors whitespace-nowrap ${FONT_SIZE.base}`;
const navLinkActive = `${navLinkBase} text-primary bg-[rgba(204,120,92,0.1)]`;
const navLinkInactive = `${navLinkBase} text-muted hover:text-body hover:bg-surface-soft`;

export function AdminNav({ slug, name, role, current }: Props) {
	const isSuperAdmin = role === "super_admin";
	const isAdmin = role === "admin" || isSuperAdmin;

	return (
		<nav className="sticky top-0 z-50 bg-canvas border-b border-hairline">
			<div className="max-w-[1200px] mx-auto px-lg h-14 flex items-center gap-sm">
				{/* Brand + breadcrumb */}
				<a href="/admin" className={`flex items-center gap-2 text-ink no-underline flex-shrink-0 ${FONT_SIZE.base}`}>
					<span className={`inline-flex items-center justify-center w-7 h-7 bg-primary text-white ${FONT_SIZE.sm} font-bold rounded-md leading-none`}>
						T
					</span>
					<span className={`hidden md:inline ${FONT_SIZE.base} font-semibold text-ink`}>Tournament</span>
				</a>

				<span className={`text-hairline ${FONT_SIZE.base} flex-shrink-0`}>/</span>

				{/* Tournament name */}
				<span className={`${FONT_SIZE.base} font-semibold text-ink overflow-hidden text-ellipsis whitespace-nowrap flex-shrink min-w-0`}>
					{name}
				</span>

				<div className="flex-1" />

				{/* Nav links */}
				<div className="flex items-center gap-1">
					{isAdmin && (
						<a href={`/admin/${slug}`} className={current === "dashboard" ? navLinkActive : navLinkInactive}>
							<span className={`hidden md:inline ${FONT_SIZE.base}`}>Dashboard</span>
							<span className={`md:hidden ${FONT_SIZE.xs}`}>DB</span>
						</a>
					)}

					<a href={`/admin/${slug}/checkin`} className={current === "checkin" ? navLinkActive : navLinkInactive}>
						<IconQrCode size={15} />
						<span className={`hidden md:inline ${FONT_SIZE.base}`}>QR Scanner</span>
					</a>

					{isSuperAdmin && (
						<>
							<a href={`/admin/${slug}/settings`} className={current === "settings" ? navLinkActive : navLinkInactive}>
								<IconSettings size={15} />
								<span className={`hidden md:inline ${FONT_SIZE.base}`}>Settings</span>
							</a>

							<a href={`/api/admin/${slug}/export`} className={navLinkInactive}>
								<IconDownload size={15} />
								<span className={`hidden md:inline ${FONT_SIZE.base}`}>Export</span>
							</a>
						</>
					)}

					<button
						onClick={async () => {
							await fetch("/api/auth/logout", { method: "POST" });
							window.location.href = "/admin";
						}}
						className={`inline-flex items-center gap-1.5 font-medium text-muted bg-transparent border-none cursor-pointer px-3 py-1.5 rounded-md hover:text-error hover:bg-surface-soft transition-colors ${FONT_SIZE.base}`}
						title="ออกจากระบบ"
					>
						<IconLogOut size={15} />
						<span className={`hidden md:inline ${FONT_SIZE.base}`}>ออกจากระบบ</span>
					</button>
				</div>
			</div>
		</nav>
	);
}
