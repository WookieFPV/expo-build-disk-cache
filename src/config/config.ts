import type { ResolveBuildCacheProps } from "@expo/config";
import { cosmiconfigSync } from "cosmiconfig";
import envPaths from "env-paths";
import { getCachedAppPath } from "../buildCache.ts";
import { getDefaultCacheDir } from "../cache/cacheDirectory.ts";
import { logger } from "../logger.ts";
import { dedupeArray } from "../utils/dedupeArray.ts";
import { xdgConfig } from "../utils/npmXdgBasedir.ts";
import {
	type BooleanLike,
	cleanupPath,
	configFilePaths,
	type NumberLike,
	parseBooleanLike,
	parseJsonLike,
	parseNumberLike,
	readEnvValue,
} from "./configHelper.ts";

const configName = "disk-cache";
export const packageName = "expo-build-disk-cache" as const;

/*
Platform specific directory for config files.
Example directory locations:

macOS: ~/Library/Preferences/expo-build-disk-cache
Windows: %APPDATA%\expo-build-disk-cache\Config (for example, C:\Users\USERNAME\AppData\Roaming\expo-build-disk-cache\Config)
Linux: ~/.config/expo-build-disk-cache (or $XDG_CONFIG_HOME/expo-build-disk-cache)

more: https://github.com/sindresorhus/env-paths?tab=readme-ov-file#pathsconfig
 */
const configDir = envPaths(packageName, { suffix: "" }).config;

const searchPlaces = dedupeArray(
	[
		"package.json",
		configFilePaths(configName), // -> disk-cache.json, disk-cache.yaml or disk-cache.yml
		configFilePaths(`.${configName}`),
		configFilePaths(packageName, configName), // -> expo-build-disk-cache/disk-cache.json [or yaml/yml]
		configFilePaths(configDir, configName),
		xdgConfig ? configFilePaths(xdgConfig, packageName, configName) : [], // to support XDG_CONFIG_HOME on non Linux platforms
		configFilePaths(".config", configName),
	].flat(),
);

export type ConfigInput = {
	cacheDir?: string;
	enable?: BooleanLike;
	debug?: BooleanLike;
	cacheGcTimeDays?: NumberLike;
	remotePlugin?: string;
	remoteOptions?: Record<string, unknown>;
};

export type Config = {
	cacheDir: string;
	enable: boolean;
	debug: boolean;
	cacheGcTimeDays: number;
	remotePlugin?: string;
	remoteOptions?: Record<string, unknown>;
	getPath: (args: ResolveBuildCacheProps) => string;
};

/**
 * Config Defaults
 */
const defaultConfig = {
	cacheDir: getDefaultCacheDir(),
	enable: true,
	debug: false,
	cacheGcTimeDays: 7,
	getPath: (args: ResolveBuildCacheProps) =>
		getCachedAppPath({ cacheDir: getDefaultCacheDir(), ...args }),
} satisfies Config;

const ENV_PREFIX = "DISK_CACHE_" as const;

function parseConfig(input: Partial<ConfigInput>): Config {
	const cacheDirValue = readEnvValue(input.cacheDir, `${ENV_PREFIX}CACHE_DIR`);
	const cacheDir =
		typeof cacheDirValue === "string" ? cleanupPath(cacheDirValue) : defaultConfig.cacheDir;

	const remotePluginValue = readEnvValue(input.remotePlugin, `${ENV_PREFIX}REMOTE_PLUGIN`);
	const remotePlugin = typeof remotePluginValue === "string" ? remotePluginValue : undefined;

	const remoteOptions = parseJsonLike(
		readEnvValue(input.remoteOptions, `${ENV_PREFIX}REMOTE_OPTIONS`),
		undefined,
	);

	return {
		cacheDir,
		enable: parseBooleanLike(
			readEnvValue(input.enable, `${ENV_PREFIX}ENABLE`),
			defaultConfig.enable,
		),
		debug: parseBooleanLike(readEnvValue(input.debug, `${ENV_PREFIX}DEBUG`), defaultConfig.debug),
		cacheGcTimeDays: parseNumberLike(
			readEnvValue(input.cacheGcTimeDays, `${ENV_PREFIX}GC_TIME_DAYS`),
			defaultConfig.cacheGcTimeDays,
		),
		remotePlugin,
		remoteOptions,
		getPath: (args: ResolveBuildCacheProps) => getCachedAppPath({ ...args, cacheDir }),
	};
}

let config: Config | null = null;

export function getConfig(appConfig?: Partial<ConfigInput> | undefined): Config {
	if (config && !appConfig) return config; // Return cached config if already loaded & no new appConfig is passed

	const explorerSync = cosmiconfigSync(configName, {
		searchPlaces,
		searchStrategy: "global",
	});

	try {
		const configResult = explorerSync.search();

		config = parseConfig({
			...defaultConfig,
			...appConfig,
			...configResult?.config,
			remoteOptions: {
				...(appConfig?.remoteOptions ?? {}),
				...(configResult?.config?.remoteOptions ?? {}),
			},
		});

		if (config.debug) {
			logger.debug("expo-build-disk-cache config:");
			logger.debug(`Searched Config File Locations: ${JSON.stringify(searchPlaces, null, 2)}`);
			const configSources: Array<{ source: string; config: unknown }> = [];
			if (configResult)
				configSources.push({
					source: configResult.filepath,
					config: configResult.config,
				});
			if (appConfig) configSources.push({ source: "appConfig", config: appConfig });

			logger.debug(`Config based on: ${JSON.stringify(configSources, null, 2)}`);
			logger.debug(`Final config: ${JSON.stringify(config, null, 2)}`);
		}

		return config ?? defaultConfig;
	} catch (error) {
		logger.error("Error loading config:", error);
		config = defaultConfig; // Assign default config even on error.
		return config;
	}
}
