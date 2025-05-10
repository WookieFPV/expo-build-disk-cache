import path from "node:path";
import { cosmiconfigSync } from "cosmiconfig";
import { z } from "zod";
import {
	NumberLikeSchema,
	booleanLikeSchema,
	cleanupPath,
	handleZodError,
} from "./configHelper.ts";

const moduleName = "disk-cache";
const folderName = "expo-build-disk-cache";

const configFormats = (basePath: string) =>
	["json", "yaml", "yml"].map((ext) => `${basePath}.${ext}`);

const searchPlaces = [
	"package.json",
	...configFormats(moduleName),
	...configFormats(`.${moduleName}`),
	...configFormats(path.join(".config", moduleName)),
	...configFormats(path.join(folderName, moduleName)),
	...configFormats(path.join(".local", "share", folderName, moduleName)),
];

/*
This is one approach to support XDG Base Directory Specification.
The other is using the default behavior of cosmiconfig.
More Info: https://github.com/cosmiconfig/cosmiconfig?tab=readme-ov-file#searchstrategy -> global
This adds the location $XDG_DATA_HOME/expo-build-disk-cache/disk-cache.json (or .yaml / .yml)
The default behavior of cosmiconfig is to look in the location $XDG_DATA_HOME/disk-cache/config.[json/yaml/...] (AFAIK)
 */
if (process.env["XDG_DATA_HOME"])
	searchPlaces.push(
		...configFormats(
			path.join(process.env["XDG_DATA_HOME"], folderName, moduleName),
		),
	);

export type Config = {
	cacheDir?: string;
	enable: boolean;
	debug: boolean;
	cacheGcTimeDays: number;
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
	})
	.catch(handleZodError(defaultConfig));

let config: Config | null = null;

export function getConfig(appConfig?: Partial<Config>): Config {
	if (config) return config; // Return cached config if already loaded

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
		});
		if (!parseResult.success) {
			console.log(
				"Config validation failed, ignore config files error:",
				parseResult.error,
			);
			return defaultConfig;
		}
		config = parseResult.data;

		if (config.debug) {
			console.log("expo-build-disk-cache config:");
			console.log("config files are searched starting from current directory");
			console.log(`Valid config file names: ${JSON.stringify(searchPlaces)}`);
			const configSources: Array<{ source: string; config: unknown }> = [];
			if (configResult)
				configSources.push({
					source: configResult.filepath,
					config: configResult.config,
				});
			if (appConfig)
				configSources.push({ source: "appConfig", config: appConfig });

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
