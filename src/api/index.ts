import type {
	BuildCacheProviderPlugin,
	ResolveBuildCacheProps,
	UploadBuildCacheProps,
} from "@expo/config";
import { getFileName } from "../buildCache.ts";
import { tryCatch } from "../utils/tryCatch.ts";
import { type ApiConfigInput, getApiConfig } from "./apiConfig.ts";
import { apiLogger } from "./apiLogger.ts";
import { cloudCache } from "./cloudCache.ts";

async function resolveBuildCache(
	args: ResolveBuildCacheProps,
	appConfig: Partial<ApiConfigInput>,
): Promise<string | null> {
	try {
		const { apiEnabled, cacheDir } = getApiConfig(appConfig);
		if (!apiEnabled) {
			apiLogger.log("🌐  Missing API config properties (apiToken or apiUrl");
			return null;
		}
		const fileKey = getFileName(args);

		const { data: downloadPath } = await tryCatch(
			cloudCache.download({
				fileKey,
				downloadDir: cacheDir,
			}),
		);
		if (downloadPath) return downloadPath;
		apiLogger.log("🌐  Cache miss: No cached build found.");
		return null;
	} catch (e) {
		apiLogger.log("🌐 Failed to download build");
		return null;
	}
}

async function uploadBuildCache(
	args: UploadBuildCacheProps,
	appConfig: Partial<ApiConfigInput>,
): Promise<string | null> {
	try {
		const { apiEnabled } = getApiConfig(appConfig);

		if (!apiEnabled) {
			apiLogger.log("🌐  Missing API config properties (apiToken or apiUrl");
			return null;
		}
		const fileKey = getFileName(args);
		await cloudCache.upload({
			fileKey,
			artifactPath: args.buildPath,
		});
		return args.buildPath;
	} catch (error) {
		apiLogger.log(`🌐  Cache update: Failed to upload to the cloud: ${error}`);
		return null;
	}
}

const ApiBuildCacheProvider = {
	resolveBuildCache,
	uploadBuildCache,
} satisfies BuildCacheProviderPlugin<ApiConfigInput>;

export default ApiBuildCacheProvider;
