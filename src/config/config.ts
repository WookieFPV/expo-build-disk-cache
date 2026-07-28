import type { ResolveBuildCacheProps } from "@expo/config";
import { cosmiconfigSync } from "cosmiconfig";
import envPaths from "env-paths";
import { getCachedAppPath } from "../buildCache.ts";
import { getDefaultCacheDir } from "../cache/cacheDirectory.ts";
import { logger } from "../logger.ts";
import { texts } from "../texts.ts";
import { dedupeArray } from "../utils/dedupeArray.ts";
import { xdgConfig } from "../utils/npmXdgBasedir.ts";
import {
	type BooleanLike,
	type ConfigIssues,
	cleanupPath,
	configFilePaths,
	type NumberLike,
	parseBooleanLike,
	parseJsonLike,
	parseNumberLike,
	parseStringLike,
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
		getCachedAppPath({ ...args, cacheDir: getDefaultCacheDir() }),
} satisfies Config;

const ENV_PREFIX = "DISK_CACHE_" as const;

/**
 * Config files are read by cosmiconfig and are therefore untyped at runtime: `input` is whatever
 * the user wrote. Every field falls back to its default on its own, so one bad value never
 * discards the rest of the config.
 */
function parseConfig(input: Record<string, unknown>, issues: ConfigIssues): Config {
	const cacheDir = cleanupPath(
		parseStringLike(
			readEnvValue(input.cacheDir, `${ENV_PREFIX}CACHE_DIR`),
			"cacheDir",
			defaultConfig.cacheDir,
			issues,
		),
	);

	const remotePlugin = parseStringLike(
		readEnvValue(input.remotePlugin, `${ENV_PREFIX}REMOTE_PLUGIN`),
		"remotePlugin",
		undefined,
		issues,
	);

	const remoteOptions = parseJsonLike(
		readEnvValue(input.remoteOptions, `${ENV_PREFIX}REMOTE_OPTIONS`),
		"remoteOptions",
		undefined,
		issues,
	);

	return {
		cacheDir,
		enable: parseBooleanLike(
			readEnvValue(input.enable, `${ENV_PREFIX}ENABLE`),
			"enable",
			defaultConfig.enable,
			issues,
		),
		debug: parseBooleanLike(
			readEnvValue(input.debug, `${ENV_PREFIX}DEBUG`),
			"debug",
			defaultConfig.debug,
			issues,
		),
		cacheGcTimeDays: parseNumberLike(
			readEnvValue(input.cacheGcTimeDays, `${ENV_PREFIX}GC_TIME_DAYS`),
			"cacheGcTimeDays",
			defaultConfig.cacheGcTimeDays,
			issues,
		),
		// Only set the optional keys when they resolve to a value, so `"remotePlugin" in config`
		// keeps working for consumers (and matches the shape the schema used to produce).
		...(remotePlugin !== undefined ? { remotePlugin } : {}),
		...(remoteOptions !== undefined ? { remoteOptions } : {}),
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
		const issues: ConfigIssues = [];

		config = parseConfig(
			{
				...defaultConfig,
				...appConfig,
				// Config files are read last on purpose: they allow per-machine overrides of the
				// (fingerprint-relevant) app config. Env vars still win, see readEnvValue.
				...configResult?.config,
				remoteOptions: {
					...(appConfig?.remoteOptions ?? {}),
					...(configResult?.config?.remoteOptions ?? {}),
				},
			},
			issues,
		);

		const configSources: Array<{ source: string; config: unknown }> = [];
		if (configResult)
			configSources.push({
				source: configResult.filepath,
				config: configResult.config,
			});
		if (appConfig) configSources.push({ source: "appConfig", config: appConfig });

		// Bad values fall back per field, so name the sources to make them findable.
		if (issues.length > 0) {
			for (const issue of issues) logger.warn(issue);
			logger.warn(
				texts.config.checkSources(
					configSources.length > 0
						? configSources.map(({ source }) => source).join(", ")
						: `environment variables (${ENV_PREFIX}*)`,
				),
			);
		}

		if (config.debug) {
			logger.debug("expo-build-disk-cache config:");
			logger.debug(`Searched Config File Locations: ${JSON.stringify(searchPlaces, null, 2)}`);
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
