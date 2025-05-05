import fs from "node:fs/promises";
import path from "node:path";
import type { RemoteBuildCachePlugin } from "@expo/config";
import type {
	ResolveRemoteBuildCacheProps,
	UploadRemoteBuildCacheProps,
} from "@expo/config/build/remoteBuildCache";
import { cacheDir } from "./config.ts";
import { fileExists, getCachedAppPath } from "./helpers";

type Options = Record<string, unknown>;

async function readFromDisk({
	projectRoot,
	platform,
	fingerprintHash,
	runOptions,
}: ResolveRemoteBuildCacheProps): Promise<string | null> {
	const cachedAppPath = getCachedAppPath({
		fingerprintHash,
		platform,
		projectRoot,
		runOptions,
		cacheDir,
	});
	const exists = await fileExists(cachedAppPath);
	if (exists) {
		console.log("💾 Using cached build from disk");
		return cachedAppPath;
	}
	console.log("💾 No Cached build found on disk");
	return null;
}

async function writeToDisk({
	projectRoot,
	runOptions,
	platform,
	fingerprintHash,
	buildPath,
}: UploadRemoteBuildCacheProps): Promise<string | null> {
	const cachedAppPath = getCachedAppPath({
		fingerprintHash,
		platform,
		projectRoot,
		runOptions,
		cacheDir,
	});

	const exits = await fileExists(cachedAppPath);
	if (exits) {
		console.log("💾 Cached build was already saved");
		return cachedAppPath;
	}
	try {
		const parentDir = path.dirname(cachedAppPath);
		await fs.mkdir(parentDir, { recursive: true });

		await fs.cp(buildPath, cachedAppPath, { recursive: true });
		console.log(`💾 Saved build output to disk: ${cachedAppPath}`);
		return cachedAppPath;
	} catch (error) {
		console.error(
			`💾 Failed to save build output to disk at ${cachedAppPath}: ${
				error instanceof Error ? error.message : "Unknown error"
			}`,
		);
		return null;
	}
}

const DiskBuildCacheProvider: RemoteBuildCachePlugin<Options> = {
	resolveRemoteBuildCache: readFromDisk,
	uploadRemoteBuildCache: writeToDisk,
};

export default DiskBuildCacheProvider;
