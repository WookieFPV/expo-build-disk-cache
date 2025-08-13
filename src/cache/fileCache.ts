import fs from "node:fs/promises";
import path from "node:path";
import type { ResolveBuildCacheProps, UploadBuildCacheProps } from "@expo/config";
import type { Config } from "../config/config.ts";
import { fileExists } from "../file/fileExists.ts";
import { getDirectorySize, getDirectoryStats } from "../file/folderHelper.ts";
import { formatBytes } from "../file/formatBytes.ts";
import { logger } from "../logger.ts";
import { tryCatch } from "../utils/tryCatch.ts";
import { readAppFiles } from "./filterFiles.ts";

export const fileCacheFactory = (
	args: UploadBuildCacheProps | ResolveBuildCacheProps,
	config: Config,
) => {
	const { cacheGcTimeDays, getPath, cacheDir } = config;
	const appPath = getPath(args);

	const cacheWrite = async (buildPath: string): Promise<void> => {
		await fs.mkdir(path.dirname(appPath), { recursive: true });
		await fs.cp(buildPath, appPath, { recursive: true });
	};

	const cacheHas = async (): Promise<boolean> => {
		const exists = await fileExists(appPath);

		if (exists) await updateFileTimestamp();
		return exists;
	};

	/**
	 * Updates the access and modification timestamps of a file to the current time.
	 */
	const updateFileTimestamp = async () => {
		try {
			const now = new Date();
			await fs.utimes(appPath, now, now); // Set both access and modification times to now
		} catch (error) {
			logger.error(`Error updating timestamp for ${appPath}:`, error);
		}
	};

	const printCacheStats = async () => {
		try {
			const folderStats = await getDirectoryStats(cacheDir);
			logger.info(
				`💾 Cache Size: ${formatBytes(folderStats.totalSize)} Files: ${folderStats.fileCount}`,
			);
		} catch (_error) {}
	};

	/**
	 * Deletes files older than a specified age in a directory (and its subdirectories).
	 */
	const cleanupCacheFiles = async () => {
		if (cacheGcTimeDays === -1) return;
		await tryCatch(fs.mkdir(cacheDir, { recursive: true }));

		logger.info(`Deleting files older than: ${cacheGcTimeDays} days in ${cacheDir}`);

		const now = Date.now();
		let deletedCount = 0;
		let deletedSize = 0;

		const { data: files, error } = await tryCatch(readAppFiles(cacheDir));
		if (error?.message?.startsWith("ENOENT")) return { deletedCount: 0, deletedSize: 0 };
		if (error) return logger.error(`Error reading directory ${cacheDir}: ${error.message}`);

		for (const file of files) {
			const filePath = path.join(cacheDir, file);

			const { data: stats, error: statError } = await tryCatch(fs.stat(filePath));
			if (statError)
				return logger.error(`Error getting stats for ${filePath}:1`, statError.message);

			const mtimeMs = stats.mtimeMs;
			const ageMs = now - mtimeMs;
			const ageDays = ageMs / (1000 * 60 * 60 * 24);
			const shouldDelete = ageDays > cacheGcTimeDays && !appPath?.includes(file);

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
			logger.info(`Removed ${deletedCount} files with size: ${formatBytes(deletedSize)}.`);

		return { deletedCount, deletedSize };
	};

	return {
		write: cacheWrite,
		has: cacheHas,
		cleanup: cleanupCacheFiles,
		printStats: printCacheStats,
		getPath: () => getPath(args),
	};
};
