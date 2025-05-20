import type {
	BuildCacheProviderPlugin,
	ResolveBuildCacheProps,
	UploadBuildCacheProps,
} from "@expo/config";
import { fileCacheFactory } from "./cache/fileCache.ts";
import { type Config, withConfig } from "./config/config";
import { logger } from "./logger.ts";
import { getRemotePlugin } from "./remotePlugin/getRemotePlugin.ts";
import { tryCatch } from "./utils/tryCatch.ts";

async function readFromDisk(args: ResolveBuildCacheProps, config: Config): Promise<string | null> {
	try {
		const fileCache = fileCacheFactory(args, config);

		const exists = await fileCache.has();
		if (exists) {
			logger.log("💾 Using cached build from disk");
			await fileCache.cleanup();
			await fileCache.printStats();
			return fileCache.getPath();
		}
		logger.log("💾 No cached build found on disk");
		if (config.remotePlugin) {
			try {
				const remotePluginProvider = await getRemotePlugin(args, {
					remotePlugin: config.remotePlugin,
					remoteOptions: config.remoteOptions,
				});

				const downloadPath = await remotePluginProvider?.resolveBuildCache(
					args,
					config.remoteOptions,
				);
				if (!downloadPath) return null;
				// Copy to disk cache (to get properly cached)
				const { error } = await tryCatch(fileCache.write(downloadPath));
				if (error) return null;
				return fileCache.getPath();
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
	const fileCache = fileCacheFactory(args, config);
	const exits = await fileCache.has();
	if (exits) {
		logger.log("💾 Cached build was already saved");
		return fileCache.getPath();
	}
	try {
		await fileCache.cleanup();
		await fileCache.write(args.buildPath);

		logger.log(`💾 Saved build output to disk: ${fileCache.getPath()}`);
		await fileCache.printStats();
		if (config.remotePlugin) {
			try {
				const remotePluginProvider = await getRemotePlugin(args, {
					remotePlugin: config.remotePlugin,
					remoteOptions: config.remoteOptions,
				});
				await remotePluginProvider?.uploadBuildCache(args, config.remoteOptions);
			} catch (e) {
				logger.log("💾 Build uploading failed!");
			}
		}
		return fileCache.getPath();
	} catch (error) {
		logger.error(
			`💾 Failed to save build output to disk at ${fileCache.getPath()}: ${
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
