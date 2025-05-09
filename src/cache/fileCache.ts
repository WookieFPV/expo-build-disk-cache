import fs from "node:fs/promises";
import path from "node:path";
import { fileExists } from "../file/fileExists.ts";
import { getDirectorySize, getDirectoryStats } from "../file/folderHelper.ts";
import { formatBytes } from "../file/formatBytes.ts";
import { logger } from "../logger.ts";
import { tryCatch } from "../utils/tryCatch.ts";
import { readAppFiles } from "./filterFiles.ts";

const cacheWrite = async ({
	cachedAppPath,
	buildPath,
}: {
	cachedAppPath: string;
	buildPath: string;
}): Promise<void> => {
	const parentDir = path.dirname(cachedAppPath);
	await fs.mkdir(parentDir, { recursive: true });
	await fs.cp(buildPath, cachedAppPath, { recursive: true });
};

const cacheHas = async (filePath: string): Promise<boolean> => {
	const exists = await fileExists(filePath);

	if (exists) await updateFileTimestamp(filePath);
	return exists;
};

/**
 * Updates the access and modification timestamps of a file to the current time.
 * @param filePath The path to the file.
 */
const updateFileTimestamp = async (filePath: string) => {
	try {
		const now = new Date();
		await fs.utimes(filePath, now, now); // Set both access and modification times to now
	} catch (error) {
		logger.error(`Error updating timestamp for ${filePath}:`, error);
	}
};

const printCacheStats = async (appPath: string) => {
	try {
		const parentFolder = path.dirname(appPath);
		const folderStats = await getDirectoryStats(parentFolder);
		logger.info(
			`💾 Cache Size: ${formatBytes(folderStats.totalSize)} Files: ${folderStats.fileCount}`,
		);
	} catch (error) {}
};

/**
 * Deletes files older than a specified age in a directory (and its subdirectories).
 * @param inputPath The path to the directory to clean up.
 * @param maxAgeDays
 * @param ignoredFile
 */
const cleanupCacheFiles = async (
	inputPath: string,
	maxAgeDays: number,
	ignoredFile?: string,
) => {
	if (maxAgeDays === -1) return;
	const directory = path.dirname(inputPath);
	logger.info(`Deleting files older than: ${maxAgeDays} days in ${directory}`);

	const now = Date.now();
	let deletedCount = 0;
	let deletedSize = 0;

	const { data: files, error } = await tryCatch(readAppFiles(directory));
	if (error)
		return logger.error(
			`Error reading directory ${directory}: ${error.message}`,
		);

	for (const file of files) {
		const filePath = path.join(directory, file);

		const { data: stats, error: statError } = await tryCatch(fs.stat(filePath));
		if (statError)
			return logger.error(
				`Error getting stats for ${filePath}:1`,
				statError.message,
			);

		const mtimeMs = stats.mtimeMs;
		const ageMs = now - mtimeMs;
		const ageDays = ageMs / (1000 * 60 * 60 * 24);
		const shouldDelete = ageDays > maxAgeDays && !ignoredFile?.includes(file);

		if (file.endsWith(".apk") && stats.isFile()) {
			logger.debug(
				`  • ${file} (${formatBytes(stats.size, 1)}) ➔ ${ageDays.toFixed(3)} days old ${shouldDelete ? "➔ 🗑️ " : ""}`,
			);
			if (!shouldDelete) continue;
			try {
				await fs.unlink(filePath);
				deletedCount++;
				deletedSize += stats.size;
			} catch (deleteError) {
				logger.error(`Error deleting file ${filePath}:`, deleteError);
			}
		} else if (file.endsWith(".app") && stats.isDirectory()) {
			const size = await getDirectorySize(filePath);
			logger.debug(
				`  • ${file} (${formatBytes(size, 1)}) ➔ ${ageDays.toFixed(3)} days old ${shouldDelete ? "➔ 🗑️ " : ""}`,
			);
			if (!shouldDelete) continue;
			try {
				await fs.rm(filePath, { recursive: true, force: true });
				deletedCount++;
				deletedSize += size;
			} catch (deleteError) {
				logger.error(`Error deleting file ${filePath}:`, deleteError);
			}
		}
	}
	logger.debug("");
	if (deletedCount)
		logger.info(
			`Removed ${deletedCount} files with size: ${formatBytes(deletedSize)}.`,
		);

	return { deletedCount, deletedSize };
};

export const fileCache = {
	write: cacheWrite,
	has: cacheHas,
	cleanup: cleanupCacheFiles,
	printStats: printCacheStats,
};
