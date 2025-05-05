import * as fs from "node:fs/promises";
import * as path from "node:path";
import { getDirectorySize, getDirectoryStats } from "../file/folderHelper.ts";
import { formatBytes } from "../file/formatBytes.ts";
import { logger } from "../logger.ts";
import { readAppFiles } from "./filterFiles.ts";

export const printCacheStats = async (appPath: string) => {
	try {
		const parentFolder = path.dirname(appPath);
		const folderStats = await getDirectoryStats(parentFolder);
		logger.info(
			`Cache Size: ${formatBytes(folderStats.totalSize)} Files: ${folderStats.fileCount}`,
		);
	} catch (error) {}
};

/**
 * Deletes files older than a specified age in a directory (and its subdirectories).
 * @param inputPath The path to the directory to clean up.
 * @param maxAgeDays
 * @param ignoredFile
 */
export const cleanupCacheFiles = async (
	inputPath: string,
	maxAgeDays: number,
	ignoredFile?: string,
) => {
	const directory = path.dirname(inputPath);
	const maxAgeMs = maxAgeDays * (1000 * 60 * 60 * 24);
	logger.info(
		`Deleting files older than: ${maxAgeDays} days in ${directory} ${ignoredFile}`,
	);

	const now = Date.now();
	let deletedCount = 0;
	let deletedSize = 0;

	try {
		const files = await readAppFiles(directory);

		for (const file of files) {
			const filePath = path.join(directory, file);

			try {
				const stats = await fs.stat(filePath);

				if (file.endsWith(".apk") && stats.isFile()) {
					const mtimeMs = stats.mtimeMs;
					const ageMs = now - mtimeMs;
					const ageDays = ageMs / (1000 * 60 * 60 * 24);

					if (ageMs > maxAgeMs && !ignoredFile?.includes(file)) {
						logger.debug(
							`  • ${file} (${formatBytes(stats.size)}) ➔ ${(ageDays).toFixed(1)} days old ➔ DELETING...`,
						);
						try {
							await fs.unlink(filePath);
							deletedCount++;
							deletedSize += stats.size;
						} catch (deleteError) {
							logger.error(`Error deleting file ${filePath}:`, deleteError);
						}
					} else {
						logger.debug(
							`  • ${file} (${formatBytes(stats.size)}) ➔ ${(ageDays).toFixed(1)} days old`,
							Math.floor(mtimeMs),
						);
					}
				} else if (file.endsWith(".app") && stats.isDirectory()) {
					const mtimeMs = stats.mtimeMs;
					const ageMs = now - mtimeMs;
					const ageDays = ageMs / (1000 * 60 * 60 * 24);
					const size = await getDirectorySize(filePath);

					if (ageMs > maxAgeMs && !ignoredFile?.includes(file)) {
						logger.debug(
							`  • ${file} (${formatBytes(size)}) ➔ ${(ageDays).toFixed(1)} days old ➔ DELETING...`,
						);
						try {
							await fs.rm(filePath, { recursive: true, force: true });
							deletedCount++;
							deletedSize += size;
						} catch (deleteError) {
							logger.error(`Error deleting file ${filePath}:`, deleteError);
						}
					} else {
						logger.debug(
							`  • ${file} (${formatBytes(size)}) ➔ ${(ageDays).toFixed(1)} days old`,
							Math.floor(mtimeMs),
						);
					}
				}
			} catch (statError) {
				logger.error(`Error getting stats for ${filePath}:1`, statError);
			}
		}
	} catch (readDirError) {
		logger.error(`Error reading directory ${directory}:`, readDirError);
	}
	logger.debug("");
	if (deletedCount)
		logger.info(
			`Removed ${deletedCount} files, removed size: ${formatBytes(deletedSize)}.`,
		);

	return { deletedCount, deletedSize };
};

/**
 * Updates the access and modification timestamps of a file to the current time.
 * @param filePath The path to the file.
 */
export const updateFileTimestamp = async (filePath: string) => {
	try {
		const now = new Date();
		await fs.utimes(filePath, now, now); // Set both access and modification times to now
	} catch (error) {
		logger.error(`Error updating timestamp for ${filePath}:`, error);
	}
};
