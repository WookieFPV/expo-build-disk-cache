import os from "node:os";
import path from "node:path";
import { cosmiconfigSync } from "cosmiconfig";

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

const config: { cacheDir?: string } = explorer.search()?.config ?? {};

/**
 * regex specifically targets ~ at the beginning of the string followed by the end of the string or a path separator, preventing unintended replacements.
 */
const regex = /^~(?=$|\/|\\)/;

export const cacheDir = config?.cacheDir
	? path.resolve(config.cacheDir.replace(regex, os.homedir()))
	: undefined;
