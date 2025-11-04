import type { ResolveBuildCacheProps } from "@expo/config";
import { cosmiconfigSync } from "cosmiconfig";
import envPaths from "env-paths";
import { z } from "zod";
import { getCachedAppPath } from "../buildCache.ts";
import { getDefaultCacheDir } from "../cache/cacheDirectory.ts";
import { logger } from "../logger.ts";
import { dedupeArray } from "../utils/dedupeArray.ts";
import { xdgConfig } from "../utils/npmXdgBasedir.ts";
import {
	type BooleanLike,
	booleanLikeSchema,
	cleanupPath,
	configFilePaths,
	createEnvAwareSchema,
	handleZodError,
	jsonLikeSchema,
	type NumberLike,
	numberLikeSchema,
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

const configSchema = z
	.object({
		cacheDir: createEnvAwareSchema(z.string().optional(), `${ENV_PREFIX}CACHE_DIR`)
			.default(getDefaultCacheDir())
			.transform(cleanupPath),
		enable: createEnvAwareSchema(booleanLikeSchema.optional(), `${ENV_PREFIX}ENABLE`)
			.default(defaultConfig.enable)
			.catch(handleZodError(defaultConfig.enable)),
		debug: createEnvAwareSchema(booleanLikeSchema.optional(), `${ENV_PREFIX}DEBUG`)
			.default(defaultConfig.debug)
			.catch(handleZodError(defaultConfig.debug)),
		cacheGcTimeDays: createEnvAwareSchema(numberLikeSchema.optional(), `${ENV_PREFIX}GC_TIME_DAYS`)
			.default(defaultConfig.cacheGcTimeDays)
			.catch(handleZodError(defaultConfig.cacheGcTimeDays)),
		remotePlugin: createEnvAwareSchema(
			z.string().optional(),
			`${ENV_PREFIX}REMOTE_PLUGIN`,
		).optional(),
		remoteOptions: createEnvAwareSchema(
			jsonLikeSchema.optional(),
			`${ENV_PREFIX}REMOTE_OPTIONS`,
		).optional(),
	})
	.transform((data) => ({
		...data,
		getPath: (args: ResolveBuildCacheProps) =>
			getCachedAppPath({ ...args, cacheDir: data.cacheDir }),
	}))
	.catch(handleZodError(defaultConfig));

let config: Config | null = null;

export function getConfig(appConfig?: Partial<ConfigInput> | undefined): Config {
	if (config && !appConfig) return config; // Return cached config if already loaded & no new appConfig is passed

	const explorerSync = cosmiconfigSync(configName, {
		searchPlaces,
		searchStrategy: "global",
	});

	try {
		const configResult = explorerSync.search();

		const parseResult = configSchema.safeParse({
			...defaultConfig,
			...appConfig,
			...configResult?.config,
			remoteOptions: {
				...(appConfig?.remoteOptions ?? {}),
				...(configResult?.config?.remoteOptions ?? {}),
			},
		});
		if (!parseResult.success) {
			logger.log("Config validation failed, ignoring config files. error:", parseResult.error);
			if (configResult?.filepath)
				logger.log(
					`Used config file: ${configResult?.filepath} with content: ${JSON.stringify(configResult?.config)}, appConfig: ${JSON.stringify(appConfig)}`,
				);
			if (appConfig) logger.log(`Used appConfig: ${JSON.stringify(appConfig)}`);
			return defaultConfig;
		}
		config = parseResult.data;

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
