import { createRequire } from "node:module";
import path from "node:path";
import type {
	BuildCacheProviderPlugin,
	ResolveBuildCacheProps,
	UploadBuildCacheProps,
} from "@expo/config";
import type { Config } from "../config/config.ts";
import { logger } from "../logger.ts";
import { texts } from "../texts.ts";

type UnknownProvider = {
	default?: unknown;
};

type ModernBuildCacheProviderPlugin = {
	calculateFingerprintHash?: BuildCacheProviderPlugin<unknown>["calculateFingerprintHash"];
	resolveBuildCache: (props: ResolveBuildCacheProps, options: unknown) => Promise<string | null>;
	uploadBuildCache: (props: UploadBuildCacheProps, options: unknown) => Promise<string | null>;
};

type LegacyBuildCacheProviderPlugin = {
	calculateFingerprintHash?: BuildCacheProviderPlugin<unknown>["calculateFingerprintHash"];
	resolveRemoteBuildCache: (
		props: ResolveBuildCacheProps,
		options: unknown,
	) => Promise<string | null>;
	uploadRemoteBuildCache: (
		props: UploadBuildCacheProps,
		options: unknown,
	) => Promise<string | null>;
};

const getProviderPackageName = (remotePlugin: string) =>
	remotePlugin === "eas" ? "eas-build-cache-provider" : remotePlugin;

const getProjectRequire = (projectRoot: string) =>
	createRequire(path.join(projectRoot, "package.json"));

function isModernProvider(plugin: unknown): plugin is ModernBuildCacheProviderPlugin {
	return (
		typeof plugin === "object" &&
		plugin !== null &&
		"resolveBuildCache" in plugin &&
		typeof plugin.resolveBuildCache === "function" &&
		"uploadBuildCache" in plugin &&
		typeof plugin.uploadBuildCache === "function"
	);
}

function isLegacyProvider(plugin: unknown): plugin is LegacyBuildCacheProviderPlugin {
	return (
		typeof plugin === "object" &&
		plugin !== null &&
		"resolveRemoteBuildCache" in plugin &&
		typeof plugin.resolveRemoteBuildCache === "function" &&
		"uploadRemoteBuildCache" in plugin &&
		typeof plugin.uploadRemoteBuildCache === "function"
	);
}

function loadProvider(projectRoot: string, providerName: string): unknown {
	const projectRequire = getProjectRequire(projectRoot);
	let providerPath: string;

	try {
		providerPath = projectRequire.resolve(providerName);
	} catch {
		throw new Error(texts.remotePlugin.missing(providerName, projectRoot));
	}

	try {
		const providerModule = projectRequire(providerPath) as UnknownProvider;
		return providerModule?.default ?? providerModule;
	} catch (error) {
		throw new Error(texts.remotePlugin.loadError(providerName, error));
	}
}

export const getRemotePlugin = async (
	args: ResolveBuildCacheProps | UploadBuildCacheProps,
	appConfig: Pick<Partial<Config>, "remotePlugin" | "remoteOptions">,
) => {
	if (!appConfig.remotePlugin) return null;

	const providerName = getProviderPackageName(appConfig.remotePlugin);

	let plugin: unknown;
	try {
		plugin = loadProvider(args.projectRoot, providerName);
	} catch (error) {
		logger.error(error instanceof Error ? error.message : String(error));
		return null;
	}

	if (!isModernProvider(plugin) && !isLegacyProvider(plugin)) {
		logger.error(texts.remotePlugin.invalid(providerName));
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
