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
		<div className="flex flex-col gap-lg">
			<h3 className="text-[20px] mb-sm font-serif">
				ข้อตกลงความยินยอม (PDPA)
			</h3>
			<p className="text-sm text-muted mb-md">
				กรุณาอ่านและให้ความยินยอมในข้อต่อไปนี้
			</p>

			{PDPACONSENT_KEYS.map((key) => (
				<div
					key={key}
					className="p-md bg-canvas border border-hairline rounded-md"
				>
					<p
						className="text-sm text-body mb-sm leading-relaxed"
					>
						{PDPACONSENT_LABELS[key]}
					</p>
					<div className="flex gap-lg">
						<label className="flex items-center gap-1.5 text-sm cursor-pointer">
							<input
								type="radio"
								name={key}
								className="radio"
								checked={values[key] === true}
								onChange={() => handleChange(key, true)}
							/>
							ยินยอม
						</label>
						<label className="flex items-center gap-1.5 text-sm cursor-pointer">
							<input
								type="radio"
								name={key}
								className="radio"
								checked={values[key] === false}
								onChange={() => handleChange(key, false)}
							/>
							ไม่ยินยอม
						</label>
					</div>
				</div>
			))}

			{!values.acknowledge_privacy_policy && (
				<p className="text-error text-xs">
					* ต้องรับทราบนโยบายความเป็นส่วนตัวจึงจะดำเนินการต่อได้
				</p>
			)}
		</div>
	);
}