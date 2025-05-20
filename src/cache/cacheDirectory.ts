import path from "node:path";
import envPaths from "env-paths";

export const getCacheDir = (cacheDir?: string): string => {
	if (cacheDir) return path.resolve(cacheDir);
	return getBuildRunCacheDirectoryPath();
};

const getBuildRunCacheDirectoryPath = (): string => path.join(getTmpDirectory(), "build-run-cache");

const getTmpDirectory = (): string => envPaths("expo-build-disk-cache", { suffix: "" }).temp;
