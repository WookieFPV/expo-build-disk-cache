import type { RemoteBuildCachePlugin } from "@expo/config";
import type {
	ResolveRemoteBuildCacheProps,
	UploadRemoteBuildCacheProps,
} from "@expo/config/build/remoteBuildCache";
import { getCachedAppPath } from "./buildCache.ts";
import { fileCache } from "./cache/fileCache.ts";
import { type Config, getConfig } from "./config/config";
import { logger } from "./logger.ts";

async function readFromDisk(
	args: ResolveRemoteBuildCacheProps,
	appConfig: Partial<Config>,
): Promise<string | null> {
	const { enable, cacheDir, cacheGcTimeDays } = getConfig(appConfig);
	if (!enable) return null;
	const cachedAppPath = getCachedAppPath({ ...args, cacheDir });

	const exists = await fileCache.has(cachedAppPath);
	if (exists) {
		logger.log("💾 Using cached build from disk");
		await fileCache.cleanup(cachedAppPath, cacheGcTimeDays, cachedAppPath);
		await fileCache.printStats(cachedAppPath);
		return cachedAppPath;
	}
	logger.log("💾 No Cached build found on disk");
	return null;
}

async function writeToDisk(
	args: UploadRemoteBuildCacheProps,
	appConfig: Partial<Config>,
): Promise<string | null> {
	const { enable, cacheDir, cacheGcTimeDays } = getConfig(appConfig);
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

		logger.log(`💾 Saved build output to disk: ${cachedAppPath}`);
		await fileCache.printStats(cachedAppPath);

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
