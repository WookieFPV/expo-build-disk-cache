import { cosmiconfigSync } from "cosmiconfig";
import envPaths from "env-paths";
import { z } from "zod";
import { dedupeArray } from "../utils/dedupeArray.ts";
import { xdgConfig } from "../utils/npmXdgBasedir.ts";
import {
	NumberLikeSchema,
	booleanLikeSchema,
	cleanupPath,
	configFilePaths,
	handleZodError,
} from "./configHelper.ts";

const moduleName = "disk-cache";
const folderName = "expo-build-disk-cache";

/*
Platform specific directory for config files.
Example directory locations:

macOS: ~/Library/Preferences/expo-build-disk-cache
Windows: %APPDATA%\expo-build-disk-cache\Config (for example, C:\Users\USERNAME\AppData\Roaming\expo-build-disk-cache\Config)
Linux: ~/.config/expo-build-disk-cache (or $XDG_CONFIG_HOME/expo-build-disk-cache)

more: https://github.com/sindresorhus/env-paths?tab=readme-ov-file#pathsconfig
 */
const configDir = envPaths("expo-build-disk-cache", { suffix: "" }).config;

const searchPlaces = dedupeArray(
	[
		"package.json",
		configFilePaths(moduleName), // -> disk-cache.json, disk-cache.yaml or disk-cache.yml
		configFilePaths(`.${moduleName}`),
		configFilePaths(folderName, moduleName), // -> expo-build-disk-cache/disk-cache.json [or yaml/yml]
		configFilePaths(configDir, moduleName),
		xdgConfig ? configFilePaths(xdgConfig, folderName, moduleName) : [], // to support XDG_CONFIG_HOME on non Linux platforms
		configFilePaths(".config", moduleName),
	].flat(),
);

export type Config = {
	cacheDir?: string;
	enable: boolean;
	debug: boolean;
	cacheGcTimeDays: number;
	remotePlugin?: string;
	remoteOptions?: Record<string, unknown>;
};

/**
 * Config Defaults
 */
const defaultConfig = {
	cacheDir: undefined,
	enable: true,
	debug: false,
	cacheGcTimeDays: 7,
} satisfies Config;

const configSchema = z
	.object({
		cacheDir: z.string().optional().transform(cleanupPath),
		enable: booleanLikeSchema
			.optional()
			.default(defaultConfig.enable)
			.catch(handleZodError(defaultConfig.enable)),
		debug: booleanLikeSchema
			.optional()
			.default(defaultConfig.debug)
			.catch(handleZodError(defaultConfig.debug)),
		cacheGcTimeDays: NumberLikeSchema.optional()
			.default(defaultConfig.cacheGcTimeDays)
			.catch(handleZodError(defaultConfig.cacheGcTimeDays)),
		remotePlugin: z.string().optional(),
		remoteOptions: z.object().loose().optional(),
	})
	.catch(handleZodError(defaultConfig));

let config: Config | null = null;

export function getConfig(appConfig?: Partial<Config> | undefined): Config {
	if (config && !appConfig) return config; // Return cached config if already loaded & no new appConfig is passed

	const explorerSync = cosmiconfigSync(moduleName, {
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
			console.log("Config validation failed, ignoring config files. error:", parseResult.error);
			if (configResult?.filepath)
				console.log(
					`Used config file: ${configResult?.filepath} with content: ${JSON.stringify(configResult?.config)}, appConfig: ${JSON.stringify(appConfig)}`,
				);
			if (appConfig) console.log(`Used appConfig: ${JSON.stringify(appConfig)}`);
			return defaultConfig;
		}
		config = parseResult.data;

		if (config.debug) {
			console.log("expo-build-disk-cache config:");
			console.log("config files are searched starting from current directory up to home directory");
			console.log(`Searched Config File Locations: ${JSON.stringify(searchPlaces, null, 2)}`);
			const configSources: Array<{ source: string; config: unknown }> = [];
			if (configResult)
				configSources.push({
					source: configResult.filepath,
					config: configResult.config,
				});
			if (appConfig) configSources.push({ source: "appConfig", config: appConfig });

			console.log(`Config based on: ${JSON.stringify(configSources, null, 2)}`);
			console.log(`Merged config: ${JSON.stringify(config, null, 2)}`);
		}

		return config ?? defaultConfig;
	} catch (error) {
		console.error("Error loading config:", error);
		config = defaultConfig; // Assign default config even on error.
		return config;
	}
}
