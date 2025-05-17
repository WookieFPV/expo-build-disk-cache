import type {
	BuildCacheProviderPlugin,
	ResolveBuildCacheProps,
	UploadBuildCacheProps,
} from "@expo/config";

async function resolveBuildCache(
	args: ResolveBuildCacheProps,
	appConfig: Partial<unknown>,
): Promise<string | null> {
	console.log("[LOG] resolveBuildCache args:");
	console.log(`[LOG] args: ${JSON.stringify(args)}`);
	console.log(`[LOG] appConfig: ${JSON.stringify(appConfig)}`);
	return null;
}

async function uploadBuildCache(
	args: UploadBuildCacheProps,
	appConfig: Partial<unknown>,
): Promise<string | null> {
	console.log("[LOG] uploadBuildCache args:");
	console.log(`[LOG] args: ${JSON.stringify(args)}`);
	console.log(`[LOG] appConfig: ${JSON.stringify(appConfig)}`);
	return null;
}

const LogBuildCacheProvider: BuildCacheProviderPlugin<unknown> = {
	resolveBuildCache,
	uploadBuildCache,
};

export default LogBuildCacheProvider;
