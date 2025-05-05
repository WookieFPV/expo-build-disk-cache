/**
 * Formats a file size in a human-readable way (e.g., 1.2 KB, 3.4 MB).
 * @param bytes The size in bytes.
 * @param decimals The number of decimal places to include.
 * @returns A human-readable string representation of the file size.
 */
export const formatBytes = (bytes: number, decimals = 2): string => {
	if (bytes === 0) return "0 Bytes";

	const k = 1024;
	const dm = decimals < 0 ? 0 : decimals;
	const sizes = ["Bytes", "KB", "MB", "GB", "TB", "PB", "EB", "ZB", "YB"];

	const i = Math.floor(Math.log(bytes) / Math.log(k));

	return `${Number.parseFloat((bytes / k ** i).toFixed(dm))} ${sizes[i]}`;
};
