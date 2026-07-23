import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import type { ResolveBuildCacheProps } from "@expo/config";
import type { Config } from "../../config/config.ts";
import { fileExists } from "../../file/fileExists.ts";
import { fileCacheFactory } from "../fileCache.ts";

const DAY_MS = 1000 * 60 * 60 * 24;

const baseArgs = {
	platform: "android",
	projectRoot: process.cwd(),
	runOptions: {},
	fingerprintHash: "test",
} satisfies ResolveBuildCacheProps;

const makeStale = async (filePath: string, days: number) => {
	const t = new Date(Date.now() - days * DAY_MS);
	await fs.utimes(filePath, t, t);
};

const makeConfig = (cacheDir: string, appPath: string): Config => ({
	cacheDir,
	enable: true,
	debug: false,
	cacheGcTimeDays: 7,
	getPath: () => appPath,
});

describe("fileCache cleanup — GC in-use guard", () => {
	let cacheDir: string;

	beforeEach(async () => {
		cacheDir = await fs.mkdtemp(path.join(os.tmpdir(), "disk-cache-gc-"));
	});

	afterEach(async () => {
		await fs.rm(cacheDir, { recursive: true, force: true });
	});

	it("keeps the in-use cached file even when it is older than the GC threshold", async () => {
		const inUse = path.join(cacheDir, "fingerprint.in-use.apk");
		await fs.writeFile(inUse, "apk");
		await makeStale(inUse, 30);

		await fileCacheFactory(baseArgs, makeConfig(cacheDir, inUse)).cleanup();

		expect(await fileExists(inUse)).toBe(true);
	});

	it("deletes an unrelated stale cache file", async () => {
		const stale = path.join(cacheDir, "fingerprint.stale.apk");
		await fs.writeFile(stale, "apk");
		await makeStale(stale, 30);

		const inUse = path.join(cacheDir, "fingerprint.in-use.apk");
		await fileCacheFactory(baseArgs, makeConfig(cacheDir, inUse)).cleanup();

		expect(await fileExists(stale)).toBe(false);
	});

	it("deletes a stale file whose name is a substring of the in-use path but not an exact basename match", async () => {
		// Regression test for the previous substring guard (`appPath.includes(file)`):
		// the in-use path embeds another cached file's name as a directory segment, so
		// the old substring check would wrongly protect the stale ghost file from GC.
		const ghostName = "fingerprint.ghost.apk";
		const ghost = path.join(cacheDir, ghostName);
		await fs.writeFile(ghost, "apk");
		await makeStale(ghost, 30);

		const inUsePath = path.join(cacheDir, ghostName, "fingerprint.real.apk");
		await fileCacheFactory(baseArgs, makeConfig(cacheDir, inUsePath)).cleanup();

		expect(await fileExists(ghost)).toBe(false);
	});
});
