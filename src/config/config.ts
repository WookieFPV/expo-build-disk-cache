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

const defaults = {
	cacheDir: undefined,
	enable: true,
	debug: false,
	cacheGcTimeDays: 7,
};

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
		for (const issue of err.issues) {
			console.error(`Invalid config file ${issue.message}`);
		}
		return defaults;
	});

export const config = configSchema.parse(rawConfig);

if (config.debug)
	console.debug(`💾 config: ${JSON.stringify(config, null, 2)}`);
