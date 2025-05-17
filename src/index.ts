import type {
	BuildCacheProviderPlugin,
	ResolveBuildCacheProps,
	UploadBuildCacheProps,
} from "@expo/config";
import { getCachedAppPath } from "./buildCache.ts";
import { fileCache } from "./cache/fileCache.ts";
import { type Config, getConfig } from "./config/config";
import { logger } from "./logger.ts";
import { getRemotePlugin } from "./remotePlugin/getRemotePlugin.ts";
import { tryCatch } from "./utils/tryCatch.ts";

async function readFromDisk(
	args: ResolveBuildCacheProps,
	appConfig: Partial<Config>,
): Promise<string | null> {
	try {
		const { enable, cacheDir, cacheGcTimeDays, remoteOptions } =
			getConfig(appConfig);
		if (!enable) return null;
		const cachedAppPath = getCachedAppPath({ ...args, cacheDir });

		const exists = await fileCache.has(cachedAppPath);
		if (exists) {
			logger.log("💾 Using cached build from disk");
			await fileCache.cleanup(cachedAppPath, cacheGcTimeDays, cachedAppPath);
			await fileCache.printStats(cachedAppPath);
			return cachedAppPath;
		}
		logger.log("💾 No cached build found on disk");
		if (appConfig.remotePlugin) {
			try {
				const remotePlugin = await getRemotePlugin(args, {
					remotePlugin: appConfig.remotePlugin,
					remoteOptions,
				});
				if (!remotePlugin) return null;

				const downloadPath = await remotePlugin.resolveBuildCache(
					args,
					remoteOptions,
				);
				if (!downloadPath) return null;
				// Copy to disk cache (to get properly cached)
				const { error } = await tryCatch(
					fileCache.write({ cachedAppPath, buildPath: downloadPath }),
				);
				if (error) return null;
				return cachedAppPath;
			} catch (e) {
				logger.log(`💾 Failed to download build: ${e}`);
			}
		}
		return null;
	} catch (e) {
		logger.log(`💾 Failed to read cache: ${e}`);
		return null;
	}
}

async function writeToDisk(
	args: UploadBuildCacheProps,
	appConfig: Partial<Config>,
): Promise<string | null> {
	const { enable, cacheDir, cacheGcTimeDays, remoteOptions } =
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

		logger.log(`💾 Saved build output to disk: ${cachedAppPath}`);
		await fileCache.printStats(cachedAppPath);
		if (appConfig.remotePlugin) {
			try {
				const remotePlugin = await getRemotePlugin(args, {
					remotePlugin: appConfig.remotePlugin,
					remoteOptions: remoteOptions,
				});
				if (!remotePlugin) return null;
				await remotePlugin.uploadBuildCache(args, remoteOptions);
			} catch (e) {
				logger.log("💾 Build uploading failed!");
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

const DiskBuildCacheProvider = {
	resolveBuildCache: readFromDisk,
	uploadBuildCache: writeToDisk,
} satisfies BuildCacheProviderPlugin<Config>;

export default DiskBuildCacheProvider;
