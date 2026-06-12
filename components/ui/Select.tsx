import type { SelectHTMLAttributes } from "react";

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
	arrowRight?: number; // px from right edge, default 12
}

/**
 * Styled select with a real positioned chevron (not background-image hack).
 * Drop-in replacement for <select className="select">.
 */
export function Select({ arrowRight = 12, style, className, children, ...props }: SelectProps) {
	return (
		<div style={{ position: "relative", display: "block", width: "100%", ...style }}>
			<select
				className={className ?? "select"}
				style={{
					appearance: "none",
					WebkitAppearance: "none",
					MozAppearance: "none",
					backgroundImage: "none",
					paddingRight: arrowRight + 28, // icon 16px + gap
					width: "100%",
				}}
				{...props}
			>
				{children}
			</select>
			{/* Custom chevron */}
			<span
				aria-hidden
				style={{
					position: "absolute",
					right: arrowRight,
					top: "50%",
					transform: "translateY(-50%)",
					pointerEvents: "none",
					display: "flex",
					alignItems: "center",
					color: "var(--color-muted)",
				}}
			>
				<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
					<polyline points="6 9 12 15 18 9" />
				</svg>
			</span>
		</div>
	);
}
