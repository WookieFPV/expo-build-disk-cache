import { cosmiconfigSync } from "cosmiconfig";
import envPaths from "env-paths";
import { getCachedAppPath } from "../buildCache.ts";
import { getDefaultCacheDir } from "../cache/cacheDirectory.ts";
import { logger } from "../logger.ts";
import type { ResolveBuildCacheProps } from "../types/buildCacheProvider.ts";
import { dedupeArray } from "../utils/dedupeArray.ts";
import { xdgConfig } from "../utils/npmXdgBasedir.ts";
import {
	asRecord,
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
 * Env variable suffix per option. Deliberately a table and not derived from the key, because
 * `cacheGcTimeDays` maps to `DISK_CACHE_GC_TIME_DAYS` and not `DISK_CACHE_CACHE_GC_TIME_DAYS`.
 */
const ENV_NAMES = {
	cacheDir: "CACHE_DIR",
	enable: "ENABLE",
	debug: "DEBUG",
	cacheGcTimeDays: "GC_TIME_DAYS",
	remotePlugin: "REMOTE_PLUGIN",
	remoteOptions: "REMOTE_OPTIONS",
} as const satisfies Record<keyof ConfigInput, string>;

type ConfigKey = keyof typeof ENV_NAMES;

/** A config source, in the order it takes precedence (excluding env variables, which always win). */
type ConfigSource = { label: string; config: Record<string, unknown> };

const envNameOf = (key: ConfigKey) => `${ENV_PREFIX}${ENV_NAMES[key]}`;

/**
 * remoteOptions is the one option that is merged per key instead of replaced, so a config file can
 * override a single option of the app config. Anything that is not an object (a JSON string, or a
 * wrong type) is passed through unchanged, leaving parseJsonLike to parse it or warn about it.
 */
const mergeRemoteOptions = (fromAppConfig: unknown, fromFile: unknown): unknown => {
	const appOptions = asRecord(fromAppConfig);
	const fileOptions = asRecord(fromFile);
	if (appOptions && fileOptions) return { ...appOptions, ...fileOptions };
	return fromFile ?? fromAppConfig ?? {};
};

/**
 * Reads options out of the merged (and, since cosmiconfig returns whatever the user wrote,
 * untyped) input, letting env variables win and collecting problems as it goes. Every option
 * falls back on its own, so one bad value never discards the rest of the config.
 */
const createReader = (input: Record<string, unknown>, sources: ConfigSource[]) => {
	const issues: ConfigIssues = [];

	const read = (key: ConfigKey) => readEnvValue(input[key], envNameOf(key));

	/** Names the option and the source it came from, so a warning points at the file to edit. */
	const labelOf = (key: ConfigKey) => {
		const envName = envNameOf(key);
		if (process.env[envName]) return `${key} in $${envName}`;
		const source = sources.find(({ config }) => key in config);
		return source ? `${key} in ${source.label}` : key;
	};

	return {
		issues,
		string: <T extends string | undefined>(key: ConfigKey, fallback: T) =>
			parseStringLike(read(key), labelOf(key), fallback, issues),
		boolean: (key: ConfigKey, fallback: boolean) =>
			parseBooleanLike(read(key), labelOf(key), fallback, issues),
		number: (key: ConfigKey, fallback: number) =>
			parseNumberLike(read(key), labelOf(key), fallback, issues),
		json: (key: ConfigKey, fallback?: Record<string, unknown>) =>
			parseJsonLike(read(key), labelOf(key), fallback, issues),
	};
};

function parseConfig(
	input: Record<string, unknown>,
	sources: ConfigSource[],
): { config: Config; issues: ConfigIssues } {
	const read = createReader(input, sources);

	const cacheDir = cleanupPath(read.string("cacheDir", defaultConfig.cacheDir));
	const remotePlugin = read.string("remotePlugin", undefined);
	// An unparsable env override falls back to the options merged from the other sources, so a typo
	// in $DISK_CACHE_REMOTE_OPTIONS does not silently strip the options the project configured.
	const remoteOptions = read.json("remoteOptions", asRecord(input["remoteOptions"]));

	const config: Config = {
		cacheDir,
		enable: read.boolean("enable", defaultConfig.enable),
		debug: read.boolean("debug", defaultConfig.debug),
		cacheGcTimeDays: read.number("cacheGcTimeDays", defaultConfig.cacheGcTimeDays),
		// Only set the optional keys when they resolve to a value, so `"remotePlugin" in config`
		// keeps working for consumers (and matches the shape the schema used to produce).
		...(remotePlugin !== undefined ? { remotePlugin } : {}),
		...(remoteOptions !== undefined ? { remoteOptions } : {}),
		getPath: (args: ResolveBuildCacheProps) => getCachedAppPath({ ...args, cacheDir }),
	};

	return { config, issues: read.issues };
}

let config: Config | null = null;
let reportedIssues = "";

/**
 * getConfig runs on every resolve/upload call, and with app config options it cannot use its
 * cache, so the same warnings would otherwise be printed several times per build.
 */
const reportIssues = (issues: ConfigIssues) => {
	const reported = issues.join("\n");
	if (reported === "" || reported === reportedIssues) return;
	reportedIssues = reported;
	for (const issue of issues) logger.warn(issue);
};

export function getConfig(appConfig?: Partial<ConfigInput> | undefined): Config {
	if (config && !appConfig) return config; // Return cached config if already loaded & no new appConfig is passed

	const explorerSync = cosmiconfigSync(configName, {
		searchPlaces,
		searchStrategy: "global",
	});

	try {
		const configResult = explorerSync.search();
		const fileConfig = asRecord(configResult?.config);
		const appConfigValues = asRecord(appConfig);

		// Ordered by precedence, matching the spread below.
		const configSources: ConfigSource[] = [];
		if (configResult && fileConfig)
			configSources.push({ label: configResult.filepath, config: fileConfig });
		if (appConfigValues) configSources.push({ label: "appConfig", config: appConfigValues });

		const parseResult = parseConfig(
			{
				...defaultConfig,
				...appConfigValues,
				// Config files are read last on purpose: they allow per-machine overrides of the
				// (fingerprint-relevant) app config. Env vars still win, see readEnvValue.
				...fileConfig,
				remoteOptions: mergeRemoteOptions(
					appConfigValues?.["remoteOptions"],
					fileConfig?.["remoteOptions"],
				),
			},
			configSources,
		);
		config = parseResult.config;
		reportIssues(parseResult.issues);

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
