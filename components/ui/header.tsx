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
		<header
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
					height: 64,
					display: "flex",
					alignItems: "center",
					justifyContent: "space-between",
				}}
			>
				{/* Logo / Home link */}
				<a
					href="/"
					style={{
						display: "flex",
						alignItems: "center",
						gap: 10,
						textDecoration: "none",
						color: "var(--color-ink)",
					}}
				>
					<span
						style={{
							display: "inline-flex",
							alignItems: "center",
							justifyContent: "center",
							width: 32,
							height: 32,
							background: "var(--color-primary)",
							borderRadius: "var(--radius-md)",
							color: "white",
							fontSize: 16,
							fontWeight: 700,
							letterSpacing: "-1px",
							lineHeight: 1,
						}}
					>
						T
					</span>
					<span
						style={{
							fontSize: 18,
							fontWeight: 600,
							letterSpacing: "-0.3px",
						}}
					>
						Tournament
					</span>
				</a>

				{/* Desktop nav */}
				<nav
					style={{
						display: "flex",
						alignItems: "center",
						gap: "var(--spacing-sm)",
					}}
					className="hidden sm:flex"
				>
					<a
						href="/"
						style={{
							fontSize: 14,
							fontWeight: 500,
							color: "var(--color-body)",
							textDecoration: "none",
							padding: "6px 12px",
							borderRadius: "var(--radius-md)",
							transition: "background 0.15s",
						}}
						onMouseOver={(e) => { e.currentTarget.style.background = "var(--color-base-200)"; }}
						onMouseOut={(e) => { e.currentTarget.style.background = "transparent"; }}
					>
						หน้าหลัก
					</a>
					{authenticated ? (
						<>
							{isAdminPlus && (
								<a
									href={backendUrl}
									style={{
										display: "inline-flex",
										alignItems: "center",
										gap: 6,
										fontSize: 14,
										fontWeight: 600,
										color: "white",
										textDecoration: "none",
										padding: "8px 16px",
										borderRadius: "var(--radius-md)",
										background: "var(--color-primary)",
										transition: "opacity 0.15s",
									}}
									onMouseOver={(e) => { e.currentTarget.style.opacity = "0.85"; }}
									onMouseOut={(e) => { e.currentTarget.style.opacity = "1"; }}
								>
									<IconSettings size={14} /> Backend
								</a>
							)}
							<button
								onClick={handleLogout}
								style={{
									display: "inline-flex",
									alignItems: "center",
									gap: 6,
									fontSize: 14,
									fontWeight: 400,
									color: "var(--color-muted)",
									padding: "8px 12px",
									borderRadius: "var(--radius-md)",
									border: "none",
									background: "transparent",
									cursor: "pointer",
									transition: "color 0.15s",
								}}
								onMouseOver={(e) => { e.currentTarget.style.color = "var(--color-error)"; }}
								onMouseOut={(e) => { e.currentTarget.style.color = "var(--color-muted)"; }}
							>
								<IconLogOut size={14} /> ออกจากระบบ
							</button>
						</>
					) : (
						<a
							href="/admin"
							style={{
								display: "inline-flex",
								alignItems: "center",
								gap: 6,
								fontSize: 14,
								fontWeight: 500,
								color: "var(--color-ink)",
								textDecoration: "none",
								padding: "8px 16px",
								borderRadius: "var(--radius-md)",
								border: "1px solid var(--color-hairline, #e6dfd8)",
								transition: "border-color 0.15s",
							}}
							onMouseOver={(e) => { e.currentTarget.style.borderColor = "var(--color-primary)"; }}
							onMouseOut={(e) => { e.currentTarget.style.borderColor = "var(--color-hairline, #e6dfd8)"; }}
						>
							<IconLock size={14} /> Admin
						</a>
					)}
				</nav>

				{/* Mobile hamburger */}
				<button
					className="btn btn-ghost btn-sm btn-circle sm:hidden"
					onClick={() => setMenuOpen(!menuOpen)}
					aria-label="Toggle menu"
				>
					{menuOpen ? <IconX size={20} /> : <IconMenu size={20} />}
				</button>
			</div>

			{/* Mobile dropdown */}
			{menuOpen && (
				<div
					className="sm:hidden"
					style={{
						borderTop: "1px solid var(--color-hairline, #e6dfd8)",
						padding: "var(--spacing-md) var(--spacing-lg)",
						background: "var(--color-base-100)",
						display: "flex",
						flexDirection: "column",
						gap: "var(--spacing-xs)",
					}}
				>
					<a
						href="/"
						onClick={() => setMenuOpen(false)}
						style={{
							fontSize: 15,
							fontWeight: 500,
							color: "var(--color-ink)",
							textDecoration: "none",
							padding: "12px 16px",
							borderRadius: "var(--radius-md)",
							display: "block",
						}}
					>
						หน้าหลัก
					</a>
					{authenticated ? (
						<>
							{isAdminPlus && (
								<a
									href={backendUrl}
									onClick={() => setMenuOpen(false)}
									style={{
										fontSize: 15,
										fontWeight: 600,
										color: "white",
										textDecoration: "none",
										padding: "12px 16px",
										borderRadius: "var(--radius-md)",
										display: "flex",
										alignItems: "center",
										gap: 8,
										background: "var(--color-primary)",
									}}
								>
									<IconSettings size={16} /> Backend
								</a>
							)}
							<button
								onClick={() => { setMenuOpen(false); handleLogout(); }}
								style={{
									fontSize: 15,
									fontWeight: 400,
									color: "var(--color-muted)",
									textDecoration: "none",
									padding: "12px 16px",
									borderRadius: "var(--radius-md)",
									display: "flex",
									alignItems: "center",
									gap: 8,
									background: "transparent",
									border: "none",
									cursor: "pointer",
									width: "100%",
									textAlign: "left",
								}}
							>
								<IconLogOut size={16} /> ออกจากระบบ
							</button>
						</>
					) : (
						<a
							href="/admin"
							onClick={() => setMenuOpen(false)}
							style={{
								fontSize: 15,
								fontWeight: 500,
								color: "var(--color-ink)",
								textDecoration: "none",
								padding: "12px 16px",
								borderRadius: "var(--radius-md)",
								display: "flex",
								alignItems: "center",
								gap: 8,
							}}
						>
							<IconLock size={16} /> Admin Dashboard
						</a>
					)}
				</div>
			)}
		</header>
	);
}
