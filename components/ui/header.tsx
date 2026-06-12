import { useState } from "react";
import { useRouteLoaderData } from "react-router";
import type { Route } from "../../app/+types/root";
import {
	IconLock,
	IconLogOut,
	IconMenu,
	IconX,
	IconSettings,
} from "./icons";

const navLinkClass = "inline-flex items-center gap-1.5 text-sm font-medium text-muted no-underline px-3 py-1.5 rounded-md transition-colors hover:text-body hover:bg-surface-soft";

export function Header() {
	const [menuOpen, setMenuOpen] = useState(false);
	const rootData = useRouteLoaderData<Route["loaderArgs"]>("root");
	const authenticated = rootData?.authenticated ?? false;
	const role = (rootData as any)?.role ?? null;
	const backendUrl = (rootData as any)?.backendUrl ?? "/admin";
	const isAdminPlus = role === "admin" || role === "super_admin";

	const handleLogout = async () => {
		await fetch("/api/auth/logout", { method: "POST" });
		window.location.href = "/";
	};

	return (
		<header className="sticky top-0 z-50 bg-canvas border-b border-hairline">
			<div className="max-w-[1200px] mx-auto px-lg h-14 flex items-center justify-between">
				{/* Logo */}
				<a href="/" className="flex items-center gap-2 text-ink no-underline flex-shrink-0">
					<span className="inline-flex items-center justify-center w-7 h-7 bg-primary text-white text-sm font-bold rounded-md leading-none">
						T
					</span>
					<span className="text-sm font-semibold text-ink">Tournament</span>
				</a>

				{/* Desktop nav — hidden on mobile */}
				<nav className="hidden md:flex items-center gap-xs">
					<a href="/" className={navLinkClass}>หน้าหลัก</a>

					{authenticated ? (
						<>
							{isAdminPlus && (
								<a
									href={backendUrl}
									className="inline-flex items-center gap-1.5 text-sm font-medium text-white px-3 py-1.5 rounded-md bg-primary transition-opacity hover:opacity-85 no-underline"
								>
									<IconSettings size={14} /> Backend
								</a>
							)}
							<button
								onClick={handleLogout}
								className="inline-flex items-center gap-1.5 text-sm font-medium text-muted px-3 py-1.5 rounded-md border-none bg-transparent cursor-pointer transition-colors hover:text-error hover:bg-surface-soft"
							>
								<IconLogOut size={14} /> ออกจากระบบ
							</button>
						</>
					) : (
						<a
							href="/admin"
							className="inline-flex items-center gap-1.5 text-sm font-medium text-muted px-3 py-1.5 rounded-md border border-hairline transition-colors hover:text-body hover:border-body no-underline"
						>
							<IconLock size={14} /> Admin
						</a>
					)}
				</nav>

				{/* Hamburger — mobile only */}
				<button
					className="md:hidden inline-flex items-center justify-center w-8 h-8 rounded-md text-muted hover:bg-surface-soft transition-colors border-none bg-transparent cursor-pointer"
					onClick={() => setMenuOpen(!menuOpen)}
					aria-label="Toggle menu"
				>
					{menuOpen ? <IconX size={18} /> : <IconMenu size={18} />}
				</button>
			</div>

			{/* Mobile dropdown */}
			{menuOpen && (
				<div className="md:hidden border-t border-hairline px-md py-sm bg-canvas flex flex-col gap-xs">
					<a
						href="/"
						onClick={() => setMenuOpen(false)}
						className="text-sm font-medium text-body py-2.5 px-3 rounded-md block no-underline hover:bg-surface-soft"
					>
						หน้าหลัก
					</a>
					{authenticated ? (
						<>
							{isAdminPlus && (
								<a
									href={backendUrl}
									onClick={() => setMenuOpen(false)}
									className="text-sm font-medium text-white py-2.5 px-3 rounded-md flex items-center gap-2 bg-primary no-underline"
								>
									<IconSettings size={15} /> Backend
								</a>
							)}
							<button
								onClick={() => { setMenuOpen(false); handleLogout(); }}
								className="text-sm font-medium text-muted py-2.5 px-3 rounded-md flex items-center gap-2 bg-transparent border-none cursor-pointer w-full text-left hover:bg-surface-soft"
							>
								<IconLogOut size={15} /> ออกจากระบบ
							</button>
						</>
					) : (
						<a
							href="/admin"
							onClick={() => setMenuOpen(false)}
							className="text-sm font-medium text-body py-2.5 px-3 rounded-md flex items-center gap-2 no-underline hover:bg-surface-soft"
						>
							<IconLock size={15} /> Admin
						</a>
					)}
				</div>
			)}
		</header>
	);
}
