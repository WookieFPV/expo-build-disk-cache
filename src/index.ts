import path from "node:path";
import type { RemoteBuildCachePlugin } from "@expo/config";
import type {
	ResolveRemoteBuildCacheProps,
	UploadRemoteBuildCacheProps,
} from "@expo/config/build/remoteBuildCache";
import { getCachedAppPath } from "./buildCache.ts";
import { fileCache } from "./cache/fileCache.ts";
import { cloudCache } from "./cloudCache/cloudCache.ts";
import { type Config, getConfig } from "./config/config";
import { logger } from "./logger.ts";
import { tryCatch } from "./utils/tryCatch.ts";

async function readFromDisk(
	args: ResolveRemoteBuildCacheProps,
	appConfig: Partial<Config>,
): Promise<string | null> {
	const { enable, cacheDir, cacheGcTimeDays, apiEnabled } =
		getConfig(appConfig);
	if (!enable) return null;
	const cachedAppPath = getCachedAppPath({ ...args, cacheDir });

	const exists = await fileCache.has(cachedAppPath);
	if (exists) {
		logger.log("💾 Cache hit: Using disk cache");
		await fileCache.cleanup(cachedAppPath, cacheGcTimeDays, cachedAppPath);
		await fileCache.printStats(cachedAppPath);
		return cachedAppPath;
	}

	if (apiEnabled) {
		const { data: bitriseCachePath } = await tryCatch(
			cloudCache.download({
				cacheDir: path.dirname(cachedAppPath),
				fileName: path.basename(cachedAppPath),
			}),
		);

		if (bitriseCachePath) {
			logger.log("💾 Cache hit: remote cache downloaded");
			return bitriseCachePath;
		}
	}

	logger.debug("💾 Cache miss: No cached build found.");
	return null;
}

async function writeToDisk(
	args: UploadRemoteBuildCacheProps,
	appConfig: Partial<Config>,
): Promise<string | null> {
	const { enable, cacheDir, cacheGcTimeDays, apiEnabled } =
		getConfig(appConfig);
	if (!enable) return null;

	const cachedAppPath = getCachedAppPath({ ...args, cacheDir });

	const exits = await fileCache.has(cachedAppPath);
	if (exits) {
		logger.log("💾 Cached build was already saved");
		return cachedAppPath;
	}
	try {
		await fileCache.cleanup(cachedAppPath, cacheGcTimeDays, cachedAppPath);
		await fileCache.write({ cachedAppPath, buildPath: args.buildPath });

		logger.log(`💾 Saved build to disk ${cacheDir ? `${cacheDir}` : ""}`);
		await fileCache.printStats(cachedAppPath);

		if (apiEnabled) {
			try {
				logger.log("💾 Cache update: uploading...");
				await cloudCache.upload({
					cacheDir: path.dirname(cachedAppPath),
					fileName: path.basename(cachedAppPath),
				});
				logger.log("💾 Cache update: Uploaded!");
			} catch (e) {
				logger.log(`💾 Cache update: Failed to upload to the cloud: ${e}`);
			}
		}
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

const DiskBuildCacheProvider: RemoteBuildCachePlugin<Config> = {
	resolveRemoteBuildCache: readFromDisk,
	uploadRemoteBuildCache: writeToDisk,
};

export default DiskBuildCacheProvider;
