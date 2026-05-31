/**
 * QR Code generation — pure JS, no Node.js dependencies.
 * Uses `qrcode-generator` which works in Cloudflare Workers runtime.
 */
import qrcode from "qrcode-generator";

/**
 * Generate a QR code as an SVG string.
 */
export function generateQRCodeSVG(token: string, cellSize = 8, margin = 4): string {
	const qr = qrcode(0, "M");
	qr.addData(token);
	qr.make();

	// Use built-in SVG generation
	return qr.createSvgTag({ cellSize, margin, scalable: true });
}

/**
 * Generate a QR code as a data URL (SVG encoded).
 * Works in Workers runtime — no Canvas or PNG needed.
 */
export function generateQRCodeDataURL(token: string): string {
	const svg = generateQRCodeSVG(token, 6, 4);
	const encoded = btoa(unescape(encodeURIComponent(svg)));
	return `data:image/svg+xml;base64,${encoded}`;
}

/**
 * Generate a QR code as an SVG string suitable for embedding in HTML email.
 */
export function generateQRCodeImageHTML(
	token: string,
	width = 200,
	height = 200,
): string {
	const svg = generateQRCodeSVG(token, 4, 2);
	const encoded = btoa(unescape(encodeURIComponent(svg)));
	return `<img src="data:image/svg+xml;base64,${encoded}" alt="QR Code" width="${width}" height="${height}" />`;
}
