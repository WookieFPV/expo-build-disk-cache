import type { Config } from "../config/config.ts";
import { logger } from "../logger.ts";
import { texts } from "../texts.ts";
import type { ResolveBuildCacheProps, UploadBuildCacheProps } from "../types/buildCacheProvider.ts";
import { tryCatch } from "../utils/tryCatch.ts";
import { resolveProviderPlugin } from "./resolveProviderPlugin.ts";

export const getRemotePlugin = async (
	args: ResolveBuildCacheProps | UploadBuildCacheProps,
	appConfig: Pick<Partial<Config>, "remotePlugin">,
) => {
	if (!appConfig.remotePlugin) return null;

	const { data: plugin, error } = await tryCatch(
		resolveProviderPlugin(args.projectRoot, appConfig.remotePlugin),
	);
	if (!plugin || error) {
		logger.log(texts.remotePlugin.loadError(appConfig.remotePlugin, error?.message));
		return null;
	}
	return plugin;
};
