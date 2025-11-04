import type {
	BuildCacheProviderPlugin,
	ResolveBuildCacheProps,
	UploadBuildCacheProps,
} from "@expo/config";
import { fileCacheFactory } from "./cache/fileCache.ts";
import {
	type Config,
	type ConfigInput as DiskCacheConfig,
	getConfig,
	packageName,
} from "./config/config";
import { withConfig } from "./config/withConfig.ts";
import { logger } from "./logger.ts";
import { getRemotePlugin } from "./remotePlugin/getRemotePlugin.ts";
import { texts } from "./texts.ts";
import { tryCatch } from "./utils/tryCatch.ts";

async function readFromDisk(args: ResolveBuildCacheProps, config: Config): Promise<string | null> {
	try {
		const fileCache = fileCacheFactory(args, config);

		const exists = await fileCache.has();
		if (exists) {
			logger.log(texts.read.hit);
			await fileCache.cleanup();
			if (config.debug) await fileCache.printStats();
			return fileCache.getPath();
		}
		logger.log(texts.read.miss);
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
				logger.log(texts.read.downloadError(e));
			}
		}
		return null;
	} catch (e) {
		logger.log(texts.read.error(e));
		return null;
	}
}

async function writeToDisk(args: UploadBuildCacheProps, config: Config): Promise<string | null> {
	const fileCache = fileCacheFactory(args, config);
	const exits = await fileCache.has();
	if (exits) {
		logger.log(texts.write.alreadySaved);
		return fileCache.getPath();
	}
	try {
		await fileCache.cleanup();
		await fileCache.write(args.buildPath);

		logger.log(texts.write.savedToDisk(fileCache.getPath()));
		await fileCache.printStats();
		if (config.remotePlugin) {
			try {
				const remotePluginProvider = await getRemotePlugin(args, {
					remotePlugin: config.remotePlugin,
					remoteOptions: config.remoteOptions,
				});
				await remotePluginProvider?.uploadBuildCache(args, config.remoteOptions);
			} catch (_e) {
				logger.log(texts.write.remoteError);
			}
		}
		return fileCache.getPath();
	} catch (error) {
		logger.error(texts.write.error(fileCache.getPath(), error));
		return null;
	}
}

const DiskBuildCacheProvider = {
	resolveBuildCache: withConfig(readFromDisk, getConfig),
	uploadBuildCache: withConfig(writeToDisk, getConfig),
} satisfies BuildCacheProviderPlugin<Partial<Config> | undefined>;

export default DiskBuildCacheProvider;

export type { DiskCacheConfig };

export type DiskCacheProvider = {
	plugin: typeof packageName;
	options?: Partial<DiskCacheConfig>;
};

export const buildDiskCacheProvider = (options?: Partial<DiskCacheConfig>): DiskCacheProvider =>
	({
		plugin: packageName,
		options,
	}) as DiskCacheProvider;
