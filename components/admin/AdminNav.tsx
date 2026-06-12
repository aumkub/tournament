import { IconQrCode, IconSettings, IconDownload, IconLogOut, IconArrowLeft } from "../ui/icons";
import type { Role } from "../../types/registration";

type Props = {
	slug: string;
	name: string;
	role: Role;
	current: "dashboard" | "checkin" | "settings";
};

const navLink = (active: boolean) => ({
	display: "inline-flex",
	alignItems: "center",
	gap: 6,
	fontSize: 14,
	fontWeight: active ? 600 : 400,
	color: active ? "var(--color-primary)" : "var(--color-body)",
	textDecoration: "none",
	padding: "6px 12px",
	borderRadius: "var(--radius-md)",
	background: active ? "rgba(204,120,92,0.08)" : "transparent",
	transition: "background 0.15s",
} as React.CSSProperties);

export function AdminNav({ slug, name, role, current }: Props) {
	const isSuperAdmin = role === "super_admin";
	const isAdmin = role === "admin" || isSuperAdmin;

	return (
		<nav
			style={{
				position: "sticky",
				top: 0,
				zIndex: 50,
				background: "var(--color-base-100)",
				borderBottom: "1px solid var(--color-hairline, #e6dfd8)",
			}}
		>
			<div
				style={{
					maxWidth: 1200,
					margin: "0 auto",
					padding: "0 var(--spacing-lg)",
					height: 56,
					display: "flex",
					alignItems: "center",
					gap: "var(--spacing-md)",
				}}
			>
				{/* Back to list */}
				<a
					href="/admin"
					style={{
						display: "inline-flex",
						alignItems: "center",
						gap: 4,
						fontSize: 13,
						color: "var(--color-muted)",
						textDecoration: "none",
						flexShrink: 0,
					}}
				>
					<IconArrowLeft size={14} />
					<span className="hidden sm:inline">รายการ</span>
				</a>

				{/* Divider */}
				<span style={{ color: "var(--color-hairline, #e6dfd8)", fontSize: 18 }}>›</span>

				{/* Tournament name */}
				<span
					style={{
						fontSize: 14,
						fontWeight: 600,
						color: "var(--color-ink)",
						overflow: "hidden",
						textOverflow: "ellipsis",
						whiteSpace: "nowrap",
						flexShrink: 1,
						minWidth: 0,
					}}
				>
					{name}
				</span>

				{/* Spacer */}
				<div style={{ flex: 1 }} />

				{/* Nav links */}
				{isAdmin && (
					<a
						href={`/admin/${slug}`}
						style={navLink(current === "dashboard")}
					>
						<span className="hidden sm:inline">Dashboard</span>
						<span className="sm:hidden">DB</span>
					</a>
				)}

				<a
					href={`/admin/${slug}/checkin`}
					style={navLink(current === "checkin")}
				>
					<IconQrCode size={15} />
					<span className="hidden sm:inline">QR Scanner</span>
				</a>

				{isSuperAdmin && (
					<>
						<a
							href={`/admin/${slug}/settings`}
							style={navLink(current === "settings")}
						>
							<IconSettings size={15} />
							<span className="hidden sm:inline">Settings</span>
						</a>

						<a
							href={`/api/admin/${slug}/export`}
							style={navLink(false)}
						>
							<IconDownload size={15} />
							<span className="hidden sm:inline">Export</span>
						</a>
					</>
				)}

				{/* Logout */}
				<button
					onClick={async () => {
						await fetch("/api/auth/logout", { method: "POST" });
						window.location.href = "/admin";
					}}
					style={{
						display: "inline-flex",
						alignItems: "center",
						gap: 6,
						fontSize: 14,
						color: "var(--color-muted)",
						background: "transparent",
						border: "none",
						cursor: "pointer",
						padding: "6px 8px",
						borderRadius: "var(--radius-md)",
					}}
					title="ออกจากระบบ"
				>
					<IconLogOut size={15} />
					<span className="hidden sm:inline">ออกจากระบบ</span>
				</button>
			</div>
		</nav>
	);
}
