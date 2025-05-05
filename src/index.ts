import fs from "node:fs/promises";
import path from "node:path";
import type { RemoteBuildCachePlugin } from "@expo/config";
import type {
	ResolveRemoteBuildCacheProps,
	UploadRemoteBuildCacheProps,
} from "@expo/config/build/remoteBuildCache";
import {
	cleanupCacheFiles,
	printCacheStats,
	updateFileTimestamp,
} from "./cache/diskCache.ts";
import { config } from "./config/config.ts";
import { fileExists, getCachedAppPath } from "./helpers";
import { logger } from "./logger.ts";

type Options = Record<string, unknown>;

async function readFromDisk({
	projectRoot,
	platform,
	fingerprintHash,
	runOptions,
}: ResolveRemoteBuildCacheProps): Promise<string | null> {
	if (!config.enable) return null;
	const cachedAppPath = getCachedAppPath({
		fingerprintHash,
		platform,
		projectRoot,
		runOptions,
		cacheDir: config.cacheDir,
	});

	const exists = await fileExists(cachedAppPath);
	if (exists) {
		logger.log("💾 Using cached build from disk");
		await cleanupCacheFiles(cachedAppPath, config.cacheGcTimeDays, [
			cachedAppPath,
		]);
		await printCacheStats(cachedAppPath);
		await updateFileTimestamp(cachedAppPath);
		return cachedAppPath;
	}
	logger.log("💾 No Cached build found on disk");
	return null;
}

async function writeToDisk({
	projectRoot,
	runOptions,
	platform,
	fingerprintHash,
	buildPath,
}: UploadRemoteBuildCacheProps): Promise<string | null> {
	if (!config.enable) return null;
	const cachedAppPath = getCachedAppPath({
		fingerprintHash,
		platform,
		projectRoot,
		runOptions,
		cacheDir: config.cacheDir,
	});

	const exits = await fileExists(cachedAppPath);
	if (exits) {
		logger.log("💾 Cached build was already saved");
		return cachedAppPath;
	}
	try {
		await cleanupCacheFiles(cachedAppPath, config.cacheGcTimeDays, [
			cachedAppPath,
		]);
		const parentDir = path.dirname(cachedAppPath);
		await fs.mkdir(parentDir, { recursive: true });
		await fs.cp(buildPath, cachedAppPath, { recursive: true });

		logger.log(`💾 Saved build output to disk: ${cachedAppPath}`);
		await printCacheStats(cachedAppPath);

		return cachedAppPath;
	} catch (error) {
		logger.error(
			`💾 Failed to save build output to disk at ${cachedAppPath}: ${
				error instanceof Error ? error.message : "Unknown error"
			}`,
		);
		return null;
	}
}

const DiskBuildCacheProvider: RemoteBuildCachePlugin<Options> = {
	resolveRemoteBuildCache: readFromDisk,
	uploadRemoteBuildCache: writeToDisk,
};

export default DiskBuildCacheProvider;
