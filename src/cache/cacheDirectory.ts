import path from "node:path";
import envPaths from "env-paths";
import { packageName } from "../config/config.ts";

export const getDefaultCacheDir = () =>
	path.join(envPaths(packageName, { suffix: "" }).temp, "build-run-cache");
