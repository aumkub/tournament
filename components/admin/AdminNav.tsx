import { IconQrCode, IconSettings, IconLogOut, IconChevronRight } from "../ui/icons";
import type { Role } from "../../types/registration";

type Props = {
	slug: string;
	name: string;
	role: Role;
	current: "dashboard" | "checkin" | "settings";
};

const PAGE_LABELS: Record<Props["current"], string> = {
	dashboard: "Dashboard",
	checkin: "Check-in",
	settings: "Settings",
};

const navLinkBase = "inline-flex items-center gap-1.5 font-medium no-underline px-3 py-1.5 rounded-md transition-colors whitespace-nowrap";
const navLinkActive = `${navLinkBase} text-primary bg-[rgba(204,120,92,0.1)]`;
const navLinkInactive = `${navLinkBase} text-muted hover:text-body hover:bg-surface-soft`;

function Chevron() {
	return <IconChevronRight size={13} color="var(--color-muted-soft)" />;
}

export function AdminNav({ slug, name, role, current }: Props) {
	const isSuperAdmin = role === "super_admin";
	const isAdmin = role === "admin" || isSuperAdmin;
	const isDashboard = current === "dashboard";

	return (
		<nav className="sticky top-0 z-50 bg-canvas border-b border-hairline">
			<div className="max-w-[1200px] mx-auto px-lg h-14 flex items-center gap-2">

				{/* Breadcrumbs */}
				<div className="flex items-center gap-1 min-w-0 flex-1">
					{/* Brand */}
					<a href="/portal" className="flex items-center gap-1.5 text-muted hover:text-body no-underline transition-colors flex-shrink-0">
						<span className="hidden sm:inline text-sm font-semibold">all Thailand</span>
					</a>

					<Chevron />

					{/* Tournament name — link to dashboard if not already there */}
					{isDashboard ? (
						<span className="text-sm font-semibold text-ink truncate min-w-0">
							{name}
						</span>
					) : (
						<>
							{isAdmin ? (
								<a
									href={`/portal/${slug}`}
									className="text-sm font-medium text-muted hover:text-body no-underline transition-colors truncate min-w-0 max-w-[160px]"
									title={name}
								>
									{name}
								</a>
							) : (
								<span className="text-sm font-medium text-muted truncate min-w-0 max-w-[160px]">
									{name}
								</span>
							)}

							<Chevron />

							{/* Current page */}
							<span className="text-sm font-semibold text-ink whitespace-nowrap">
								{PAGE_LABELS[current]}
							</span>
						</>
					)}
				</div>

				{/* Nav actions */}
				<div className="flex items-center gap-1 flex-shrink-0">
					{isAdmin && (
						<a href={`/portal/${slug}`} className={current === "dashboard" ? navLinkActive : navLinkInactive}>
							<span className="hidden md:inline md:!text-sm">Dashboard</span>
							<span className="md:hidden text-xs">DB</span>
						</a>
					)}

					<a href={`/portal/${slug}/checkin`} className={current === "checkin" ? navLinkActive : navLinkInactive}>
						<IconQrCode size={15} />
						<span className="hidden md:inline md:!text-sm">Check-in</span>
					</a>

					{isSuperAdmin && (
						<a href={`/portal/${slug}/settings`} className={current === "settings" ? navLinkActive : navLinkInactive}>
							<IconSettings size={15} />
							<span className="hidden md:inline md:!text-sm">Settings</span>
						</a>
					)}
				</div>
			</div>
		</nav>
	);
}
