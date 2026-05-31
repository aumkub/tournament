import {
	PDPACONSENT_LABELS,
	PDPACONSENT_KEYS,
	type PDPAConsents,
} from "../../types/registration";

interface PDPASectionProps {
	values: PDPAConsents;
	onChange: (values: PDPAConsents) => void;
}

export function PDPASection({ values, onChange }: PDPASectionProps) {
	const handleChange = (key: keyof PDPAConsents, value: boolean) => {
		onChange({ ...values, [key]: value });
	};

	return (
		<div style={{ display: "flex", flexDirection: "column", gap: "var(--spacing-lg)" }}>
			<h3 style={{ fontSize: 20, marginBottom: "var(--spacing-sm)", fontFamily: "var(--font-serif)" }}>
				ข้อตกลงความยินยอม (PDPA)
			</h3>
			<p style={{ fontSize: 14, color: "var(--color-muted)", marginBottom: "var(--spacing-md)" }}>
				กรุณาอ่านและให้ความยินยอมในข้อต่อไปนี้
			</p>

			{PDPACONSENT_KEYS.map((key) => (
				<div
					key={key}
					style={{
						padding: "var(--spacing-md)",
						background: "var(--color-canvas)",
						border: "1px solid var(--color-hairline)",
						borderRadius: "var(--radius-md)",
					}}
				>
					<p
						style={{
							fontSize: 14,
							color: "var(--color-body)",
							marginBottom: "var(--spacing-sm)",
							lineHeight: 1.5,
						}}
					>
						{PDPACONSENT_LABELS[key]}
					</p>
					<div style={{ display: "flex", gap: "var(--spacing-lg)" }}>
						<label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 14, cursor: "pointer" }}>
							<input
								type="radio"
								name={key}
								checked={values[key] === true}
								onChange={() => handleChange(key, true)}
							/>
							ยินยอม
						</label>
						<label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 14, cursor: "pointer" }}>
							<input
								type="radio"
								name={key}
								checked={values[key] === false}
								onChange={() => handleChange(key, false)}
							/>
							ไม่ยินยอม
						</label>
					</div>
				</div>
			))}

			{!values.acknowledge_privacy_policy && (
				<p style={{ color: "var(--color-error)", fontSize: 13 }}>
					* ต้องรับทราบนโยบายความเป็นส่วนตัวจึงจะดำเนินการต่อได้
				</p>
			)}
		</div>
	);
}
