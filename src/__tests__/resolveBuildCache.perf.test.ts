import { afterEach, describe, expect, it } from "bun:test";
import fs from "node:fs/promises";
import os from "node:os";
import type { ResolveBuildCacheProps } from "@expo/config";
import DiskBuildCacheProvider from "../index.ts";
import { timedPromise } from "../utils/timedPromise.ts";
import { mockAppBuildWithSize } from "./mockAppBuild.ts";

const baseOptions: Omit<ResolveBuildCacheProps, "fingerprintHash"> = {
	platform: "android",
	projectRoot: process.cwd(),
	runOptions: {},
};

/**
 * These budgets are wall-clock and therefore machine dependent - they fail on slow or shared
 * CI disks without anything being wrong, and every case writes its size twice (build output +
 * cache copy). Run them with `bun run test:perf`; plain `bun test` skips them.
 *
 * Only the timing lives here. The functional side of the same round trip (cache miss, write,
 * cache hit, log output) is covered by resolveBuildCache.test.ts, which always runs.
 */
const perfTestsEnabled = process.env.PERF_TESTS === "1";

/** A cache lookup is a stat() plus a GC pass, so it is size independent. */
const readBudgetMs = 100;
const writeBudgetMsPerMb = 2;
/** 500Mb of disk writes can outlast the 5s default on a slow disk. */
const timeoutMs = 120_000;

/** Both the mock build output and its copy in the cache dir, so a run leaves nothing behind. */
const tempFiles: string[] = [];

afterEach(async () => {
	await Promise.all(
		tempFiles.splice(0).map((file) => fs.rm(file, { force: true, recursive: true })),
	);
});

describe.skipIf(!perfTestsEnabled)("resolveBuildCache Perf", () => {
	it.each([100, 500])(
		"should save and resolve %iMb under 2ms per MB",
		async (sizeMb) => {
			const options = { ...baseOptions, fingerprintHash: crypto.randomUUID() };
			const args = {};

			const [resultRead1, readDuration1] = await timedPromise(
				DiskBuildCacheProvider.resolveBuildCache(options, args),
			);
			expect(resultRead1).toBeNull();
			expect(readDuration1).toBeLessThan(readBudgetMs);

			const [buildPath, mockBuildDuration] = await timedPromise(
				mockAppBuildWithSize(options.fingerprintHash, sizeMb),
			);
			tempFiles.push(buildPath);

			const [resultWrite, writeDuration] = await timedPromise(
				DiskBuildCacheProvider.uploadBuildCache({ ...options, buildPath }, args),
			);
			// Registered before the assertions so a failed budget still cleans up what it wrote.
			if (resultWrite) tempFiles.push(resultWrite);
			expect(resultWrite).toBeString();
			expect(writeDuration).toBeLessThan(sizeMb * writeBudgetMsPerMb);

			const [resultRead2, readDuration2] = await timedPromise(
				DiskBuildCacheProvider.resolveBuildCache(options, args),
			);
			expect(resultRead2).toBeString();
			expect(readDuration2).toBeLessThan(readBudgetMs);

			const msPerMb = (writeDuration / sizeMb).toFixed(2);
			console.log(
				[
					`${sizeMb}Mb`,
					`  resolveBuildCache:    ${readDuration1}ms (cache miss)`,
					`  mockAppBuildWithSize: ${mockBuildDuration}ms`,
					`  uploadBuildCache:     ${writeDuration}ms (${msPerMb}ms per MB)`,
					`  resolveBuildCache:    ${readDuration2}ms (cache hit)`,
				].join(os.EOL),
			);
		},
		timeoutMs,
	);
});
