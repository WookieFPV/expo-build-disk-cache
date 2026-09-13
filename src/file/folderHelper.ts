import fs from "node:fs/promises";
import path from "node:path";
import { readAppFiles } from "../cache/filterFiles.ts";
import { logger } from "../logger.ts";
import { tryCatch } from "../utils/tryCatch.ts";

/**
 * Recursively calculates the total size of files within a folder.
 *
 * Reads directory entries with their type so that only files need an extra `stat` call. Symlinks
 * are not followed and count as 0: an `.app` bundle is copied with `verbatimSymlinks`, so following
 * them would double-count targets inside the bundle (or escape the cache entirely).
 */
export async function getDirectorySize(folderPath: string): Promise<number> {
	let totalSize = 0;

	const entries = await fs.readdir(folderPath, { withFileTypes: true });

	for (const entry of entries) {
		const itemPath = path.join(folderPath, entry.name);

		if (entry.isFile()) {
			const { size } = await fs.stat(itemPath);
			totalSize += size;
		} else if (entry.isDirectory()) {
			totalSize += await getDirectorySize(itemPath); // Recursively get size of subfolder
		}
	}

	return totalSize;
}

/**
 * Calculates the total size and number of cached build artifacts in a directory.
 *
 * `fileCount` counts cache entries, not files on disk: an `.app` bundle is one entry whose whole
 * tree contributes to `totalSize`. An entry that cannot be read is skipped rather than aborting
 * the whole calculation, so stats stay useful on a partially broken cache directory.
 */
export const getDirectoryStats = async (
	directory: string,
): Promise<{ totalSize: number; fileCount: number }> => {
	let totalSize = 0;
	let fileCount = 0;

	const { data: files, error } = await tryCatch(readAppFiles(directory));
	if (error) {
		logger.error(`Error accessing directory ${directory}:`, error);
		return { totalSize, fileCount };
	}

	for (const file of files) {
		const filePath = path.join(directory, file);
		const { data: entrySize } = await tryCatch(sizeOfEntry(filePath));
		if (entrySize === null) continue;

		totalSize += entrySize;
		fileCount++;
	}

	return { totalSize, fileCount };
};

const sizeOfEntry = async (filePath: string): Promise<number> => {
	const stats = await fs.stat(filePath);
	if (stats.isFile()) return stats.size;
	if (stats.isDirectory()) return await getDirectorySize(filePath);
	return 0;
};
