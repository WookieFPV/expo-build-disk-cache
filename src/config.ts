import os from "node:os";
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

export const cacheDir = config?.cacheDir?.replace("~", os.homedir());
