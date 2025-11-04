// @ts-expect-error
import * as expoCacheProviderUtils from "@expo/cli/build/src/utils/build-cache-providers/index";
import type {
	BuildCacheProvider,
	BuildCacheProviderPlugin,
	ResolveBuildCacheProps,
	UploadBuildCacheProps,
} from "@expo/config";
import type { Config } from "../config/config.ts";
import { logger } from "../logger.ts";
import { texts } from "../texts.ts";
import { tryCatch } from "../utils/tryCatch.ts";

export const getRemotePlugin = async (
	args: ResolveBuildCacheProps | UploadBuildCacheProps,
	appConfig: Pick<Partial<Config>, "remotePlugin" | "remoteOptions">,
) => {
	if (!("remotePlugin" in appConfig)) return null;

	const remotePluginConfig =
		appConfig.remotePlugin === "eas"
			? "eas"
			: { plugin: appConfig.remotePlugin, options: appConfig.remoteOptions };

	const { data, error } = await tryCatch<BuildCacheProvider>(
		expoCacheProviderUtils.resolveBuildCacheProvider(remotePluginConfig, args.projectRoot),
	);
	const plugin = data?.plugin;
	if (!plugin || error) {
		logger.log(texts.remotePlugin.loadError(appConfig.remotePlugin));
		return null;
	}
	return {
		resolveBuildCache:
			"resolveBuildCache" in plugin ? plugin.resolveBuildCache : plugin.resolveRemoteBuildCache,
		uploadBuildCache:
			"uploadBuildCache" in plugin ? plugin.uploadBuildCache : plugin.uploadRemoteBuildCache,
		calculateFingerprintHash: plugin.calculateFingerprintHash,
	} satisfies BuildCacheProviderPlugin<unknown>;
};
