const UNITS = ["Bytes", "KB", "MB", "GB", "TB", "PB", "EB", "ZB", "YB"] as const;

/**
 * Formats a file size in a human-readable way (e.g., 1.2 KB, 3.4 MB).
 * @param bytes The size in bytes.
 * @param decimals The number of decimal places to include.
 * @returns A human-readable string representation of the file size.
 */
export const formatBytes = (bytes: number, decimals = 2): string => {
	if (!Number.isFinite(bytes) || bytes <= 0) return "0 Bytes";

	const dm = Math.max(0, decimals);
	// Clamped so that a size beyond the largest known unit degrades to "… YB" instead of "undefined".
	const exponent = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), UNITS.length - 1);

	return `${Number.parseFloat((bytes / 1024 ** exponent).toFixed(dm))} ${UNITS[exponent]}`;
};
