import { describe, expect, it } from "bun:test";
import os from "node:os";
import type { ResolveBuildCacheProps } from "@expo/config";
import DiskBuildCacheProvider from "../index.ts";
import { texts } from "../texts.ts";
import { timedPromise } from "../utils/timedPromise.ts";
import { mockAppBuildWithSize } from "./mockAppBuild.ts";
import { mockLogger } from "./test-setup.ts";

const baseOptions: Omit<ResolveBuildCacheProps, "fingerprintHash"> = {
	platform: "android",
	projectRoot: process.cwd(),
	runOptions: {},
};

describe("resolveBuildCache Perf", () => {
	it("should save and resolve 100Mb in unser 100ms", async () => {
		const sizeMb = 100;

		const options = { ...baseOptions, fingerprintHash: crypto.randomUUID() };
		const args = {};

		const [resultRead1, readDuration1] = await timedPromise(
			DiskBuildCacheProvider.resolveBuildCache(options, args),
		);
		expect(readDuration1).toBeLessThan(100);
		expect(resultRead1).toBeNull();

		const [buildPath, mockBuildDuration] = await timedPromise(
			mockAppBuildWithSize(options.fingerprintHash, sizeMb),
		);

		const [resultWrite, writeDuration] = await timedPromise(
			DiskBuildCacheProvider.uploadBuildCache({ ...options, buildPath }, args),
		);
		expect(writeDuration).toBeLessThan(sizeMb * 2); // take less than 2ms per MB
		expect(resultWrite).toBeString();

		const [resultRead2, readDuration2] = await timedPromise(
			DiskBuildCacheProvider.resolveBuildCache(options, args),
		);
		expect(readDuration2).toBeLessThan(100);
		expect(resultRead2).toBeString();

		console.log(
			[
				`resolveBuildCache: ${readDuration1} (cache miss)`,
				`mockAppBuildWithSize: ${mockBuildDuration}`,
				`uploadBuildCache: ${writeDuration}`,
				`resolveBuildCache: ${readDuration2}`,
			].join(os.EOL),
		);
	});
	it("should save and resolve 500Mb in unser 500ms", async () => {
		const sizeMb = 500;

		const options = { ...baseOptions, fingerprintHash: crypto.randomUUID() };
		const args = {};

		const [resultRead1, readDuration1] = await timedPromise(
			DiskBuildCacheProvider.resolveBuildCache(options, args),
		);
		expect(mockLogger.log).toHaveBeenLastCalledWith(texts.read.miss);

		expect(readDuration1).toBeLessThan(100);
		expect(resultRead1).toBeNull();

		const [buildPath, mockBuildDuration] = await timedPromise(
			mockAppBuildWithSize(options.fingerprintHash, sizeMb),
		);

		const [resultWrite, writeDuration] = await timedPromise(
			DiskBuildCacheProvider.uploadBuildCache({ ...options, buildPath }, args),
		);
		expect(writeDuration).toBeLessThan(sizeMb * 2); // take less than 2ms per MB
		expect(resultWrite).toBeString();
		expect(mockLogger.log).toHaveBeenLastCalledWith(texts.write.savedToDisk(resultWrite as string));

		const [resultRead2, readDuration2] = await timedPromise(
			DiskBuildCacheProvider.resolveBuildCache(options, args),
		);
		expect(mockLogger.log).toHaveBeenLastCalledWith(texts.read.hit);

		expect(mockLogger.log).toHaveBeenLastCalledWith(texts.read.hit);
		expect(readDuration2).toBeLessThan(100);
		expect(resultRead2).toBeString();

		console.log(
			[
				`resolveBuildCache: ${readDuration1} (cache miss)`,
				`mockBuildDuration: ${mockBuildDuration}`,
				`uploadBuildCache: ${writeDuration}`,
				`resolveBuildCache: ${readDuration2}`,
			].join(os.EOL),
		);
	});
});
