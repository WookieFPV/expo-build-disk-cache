import { cosmiconfigSync } from "cosmiconfig";
import { z } from "zod";
import {
	NumberLikeSchema,
	booleanLikeSchema,
	cleanupPath,
	handleZodError,
} from "./configHelper.ts";

const moduleName = "disk-cache";

const searchPlaces = [
	"package.json",
	`.${moduleName}.json`,
	`.${moduleName}.yaml`,
	`.${moduleName}.yml`,
	`.config/${moduleName}`,
	`.config/${moduleName}.json`,
	`.config/${moduleName}.yaml`,
	`.config/${moduleName}.yml`,
];

const explorer = cosmiconfigSync(moduleName, { searchPlaces });

const rawConfig = explorer.search()?.config ?? {};

export type Config = {
	cacheDir?: string;
	enable: boolean;
	debug: boolean;
	cacheGcTimeDays: number;
};

/**
 * Config Defaults
 */
const defaults = {
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
			.default(defaults.enable)
			.catch(handleZodError(defaults.enable)),
		debug: booleanLikeSchema
			.optional()
			.default(defaults.debug)
			.catch(handleZodError(defaults.debug)),
		cacheGcTimeDays: NumberLikeSchema.optional()
			.default(defaults.cacheGcTimeDays)
			.catch(handleZodError(defaults.cacheGcTimeDays)),
	})
	.catch((err) => {
		// Zod V4 Error Handling:
		if ("issues" in err && Array.isArray(err.issues)) {
			for (const issue of err.issues) {
				console.error(`Invalid config file ${issue.message}`);
			}
			// Zod V3 Error Handling:
		} else if (err.error && err.error instanceof Error) {
			console.error(`Invalid config file ${err.error.message}`);
		}
		return defaults;
	});

export const getConfig = (appConfig?: Partial<Config>) => {
	const combinedConfig = { ...appConfig, ...rawConfig };
	return configSchema.parse(combinedConfig);
};
