import fs from "node:fs/promises";
import path from "node:path";
import type { Config } from "../config/config.ts";
import { fileExists } from "../file/fileExists.ts";
import { getDirectorySize, getDirectoryStats } from "../file/folderHelper.ts";
import { formatBytes } from "../file/formatBytes.ts";
import { logger } from "../logger.ts";
import type { ResolveBuildCacheProps, UploadBuildCacheProps } from "../types/buildCacheProvider.ts";
import { tryCatch } from "../utils/tryCatch.ts";
import { readAppFiles } from "./filterFiles.ts";

const DAY_MS = 1000 * 60 * 60 * 24;

export type CleanupResult = { deletedCount: number; deletedSize: number };

export const fileCacheFactory = (
	args: UploadBuildCacheProps | ResolveBuildCacheProps,
	config: Config,
) => {
	const { cacheGcTimeDays, getPath, cacheDir, debug } = config;
	const appPath = getPath(args);

	const cacheWrite = async (buildPath: string): Promise<void> => {
		await fs.mkdir(path.dirname(appPath), { recursive: true });
		await fs.cp(buildPath, appPath, { recursive: true, verbatimSymlinks: true });
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
		const now = new Date();
		const { error } = await tryCatch(fs.utimes(appPath, now, now));
		if (error) logger.error(`Error updating timestamp for ${appPath}:`, error);
	};

	const printCacheStats = async () => {
		const { data: folderStats } = await tryCatch(getDirectoryStats(cacheDir));
		if (!folderStats) return;
		logger.info(
			`💾 Cache Size: ${formatBytes(folderStats.totalSize)} Files: ${folderStats.fileCount}`,
		);
	};

	/**
	 * Size of a cache entry: a file's own size, or the total size of an `.app` bundle directory.
	 * A directory that cannot be walked is reported as 0 rather than aborting the cleanup.
	 */
	const entrySize = async (filePath: string, stats: { isFile(): boolean; size: number }) => {
		if (stats.isFile()) return stats.size;
		const { data: size } = await tryCatch(getDirectorySize(filePath));
		return size ?? 0;
	};

	/**
	 * Deletes files older than a specified age in a directory (and its subdirectories).
	 */
	const cleanupCacheFiles = async (): Promise<CleanupResult> => {
		const empty: CleanupResult = { deletedCount: 0, deletedSize: 0 };
		if (cacheGcTimeDays === -1) return empty;
		await tryCatch(fs.mkdir(cacheDir, { recursive: true }));

		logger.info(`Deleting files older than: ${cacheGcTimeDays} days in ${cacheDir}`);

		const now = Date.now();
		let deletedCount = 0;
		let deletedSize = 0;

		const { data: files, error } = await tryCatch(readAppFiles(cacheDir));
		if (error) {
			// A cache directory that does not exist yet simply has nothing to clean up.
			if (!error.message?.startsWith("ENOENT"))
				logger.error(`Error reading directory ${cacheDir}: ${error.message}`);
			return empty;
		}

		// The entry currently being resolved/uploaded must survive GC even when it is stale.
		const inUseFile = path.basename(appPath);

		for (const file of files) {
			const filePath = path.join(cacheDir, file);

			// One unreadable entry must not abort the cleanup of the remaining ones.
			const { data: stats, error: statError } = await tryCatch(fs.stat(filePath));
			if (statError) {
				logger.error(`Error getting stats for ${filePath}:`, statError.message);
				continue;
			}

			const ageDays = (now - stats.mtimeMs) / DAY_MS;
			const shouldDelete = ageDays > cacheGcTimeDays && file !== inUseFile;
			// Sizing an `.app` bundle means walking its whole tree, so only pay for it when the
			// number is actually used: for the debug listing, or for the deleted-bytes tally.
			const size = shouldDelete || debug ? await entrySize(filePath, stats) : 0;

			logger.debug(
				`  • ${file} (${formatBytes(size, 1)}) ➔ ${ageDays.toFixed(3)} days old ${shouldDelete ? "➔ 🗑️ " : ""}`,
			);
			if (!shouldDelete) continue;

			const { error: deleteError } = await tryCatch(
				fs.rm(filePath, { recursive: true, force: true }),
			);
			if (deleteError) {
				logger.error(`Error deleting file ${filePath}:`, deleteError);
				continue;
			}
			deletedCount++;
			deletedSize += size;
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
		getPath: () => appPath,
	};
};
