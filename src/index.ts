import type {
	BuildCacheProviderPlugin,
	ResolveBuildCacheProps,
	UploadBuildCacheProps,
} from "@expo/config";
import { fileCache } from "./cache/fileCache.ts";
import { type Config, withConfig } from "./config/config";
import { logger } from "./logger.ts";
import { getRemotePlugin } from "./remotePlugin/getRemotePlugin.ts";
import { tryCatch } from "./utils/tryCatch.ts";

async function readFromDisk(args: ResolveBuildCacheProps, config: Config): Promise<string | null> {
	try {
		const { cacheGcTimeDays, remoteOptions, remotePlugin, getPath } = config;
		const appPath = getPath(args);

		const exists = await fileCache.has(appPath);
		if (exists) {
			logger.log("💾 Using cached build from disk");
			await fileCache.cleanup(appPath, cacheGcTimeDays, appPath);
			await fileCache.printStats(appPath);
			return appPath;
		}
		logger.log("💾 No cached build found on disk");
		if (remotePlugin) {
			try {
				const remotePluginProvider = await getRemotePlugin(args, {
					remotePlugin,
					remoteOptions,
				});

				const downloadPath = await remotePluginProvider?.resolveBuildCache(args, remoteOptions);
				if (!downloadPath) return null;
				// Copy to disk cache (to get properly cached)
				const { error } = await tryCatch(fileCache.write({ appPath, buildPath: downloadPath }));
				if (error) return null;
				return appPath;
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

async function writeToDisk(args: UploadBuildCacheProps, config: Config): Promise<string | null> {
	const { cacheGcTimeDays, remoteOptions, remotePlugin, getPath } = config;
	const appPath = getPath(args);

	const exits = await fileCache.has(appPath);
	if (exits) {
		logger.log("💾 Cached build was already saved");
		return appPath;
	}
	try {
		await fileCache.cleanup(appPath, cacheGcTimeDays, appPath);
		await fileCache.write({ appPath, buildPath: args.buildPath });

		logger.log(`💾 Saved build output to disk: ${appPath}`);
		await fileCache.printStats(appPath);
		if (remotePlugin) {
			try {
				const remotePluginProvider = await getRemotePlugin(args, {
					remotePlugin,
					remoteOptions,
				});
				await remotePluginProvider?.uploadBuildCache(args, remoteOptions);
			} catch (e) {
				logger.log("💾 Build uploading failed!");
			}
		}
		return appPath;
	} catch (error) {
		logger.error(
			`💾 Failed to save build output to disk at ${appPath}: ${
				error instanceof Error ? error.message : "Unknown error"
			}`,
		);
		return null;
	}
}

const DiskBuildCacheProvider = {
	resolveBuildCache: withConfig(readFromDisk),
	uploadBuildCache: withConfig(writeToDisk),
} satisfies BuildCacheProviderPlugin<Partial<Config> | undefined>;

export default DiskBuildCacheProvider;
