import { useEffect, useRef } from "react";

interface TurnstileWidgetProps {
	siteKey: string;
	onToken: (token: string) => void;
	onExpire?: () => void;
}

export function TurnstileWidget({ siteKey, onToken, onExpire }: TurnstileWidgetProps) {
	const containerRef = useRef<HTMLDivElement>(null);
	const widgetIdRef = useRef<string | null>(null);

	useEffect(() => {
		const w = window as any;
		let intervalId: ReturnType<typeof setInterval> | null = null;

		function render() {
			if (!containerRef.current || !w.turnstile) return;
			if (widgetIdRef.current) {
				try { w.turnstile.remove(widgetIdRef.current); } catch { /* ignore */ }
			}
			widgetIdRef.current = w.turnstile.render(containerRef.current, {
				sitekey: siteKey,
				callback: onToken,
				"expired-callback": () => { widgetIdRef.current = null; onExpire?.(); },
				"error-callback": () => { widgetIdRef.current = null; onExpire?.(); },
			});
		}

		if (w.turnstile) {
			render();
		} else {
			intervalId = setInterval(() => {
				if (w.turnstile) {
					clearInterval(intervalId!);
					intervalId = null;
					render();
				}
			}, 100);
		}

		return () => {
			if (intervalId) clearInterval(intervalId);
			if (widgetIdRef.current && w.turnstile) {
				try { w.turnstile.remove(widgetIdRef.current); } catch { /* ignore */ }
				widgetIdRef.current = null;
			}
		};
	}, [siteKey]);

	return <div ref={containerRef} />;
}
