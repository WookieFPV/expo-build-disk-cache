import path from "node:path";
import envPaths from "env-paths";

export const getDefaultCacheDir = () =>
	path.join(envPaths("expo-build-disk-cache", { suffix: "" }).temp, "build-run-cache");
