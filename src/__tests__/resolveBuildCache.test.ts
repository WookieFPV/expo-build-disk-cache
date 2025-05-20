import { describe, expect, it } from "bun:test";
import os from "node:os";
import type { ResolveBuildCacheProps } from "@expo/config";
import DiskBuildCacheProvider from "../index.ts";
import { mockAppBuild } from "./mockAppBuild.ts";

const baseOptions: Omit<ResolveBuildCacheProps, "fingerprintHash"> = {
	platform: "android",
	projectRoot: process.cwd(),
	runOptions: {},
};

describe("DiskBuildCacheProvider", () => {
	it("should upload build cache without crashing when args are undefined", async () => {
		const fingerprintHash = crypto.randomUUID();
		const buildPath = await mockAppBuild(fingerprintHash);
		const options = { ...baseOptions, fingerprintHash, buildPath };
		const args = undefined;

		const result = await DiskBuildCacheProvider.uploadBuildCache(options, args);
		expect(result).toBeString();
		expect(result?.endsWith(`/fingerprint.${fingerprintHash}.apk`)).toBeTrue();
	});

	it("should resolve build cache without crashing when args are defined", async () => {
		const options = { ...baseOptions, fingerprintHash: crypto.randomUUID() };
		const args = { cacheDir: "~/my-cache-dir/" };

		const result = await DiskBuildCacheProvider.resolveBuildCache(options, args);
		expect(result).toBeNull();
	});

	it("should resolve build cache without crashing when args are undefined", async () => {
		const options = { ...baseOptions, fingerprintHash: crypto.randomUUID() };
		const args = undefined;

		const result = await DiskBuildCacheProvider.resolveBuildCache(options, args);
		expect(result).toBeNull();
	});

	it("should save and resolve build caches to/from disk", async () => {
		const options = { ...baseOptions, fingerprintHash: crypto.randomUUID() };
		const args = {};

		const resultRead1 = await DiskBuildCacheProvider.resolveBuildCache(options, args);
		expect(resultRead1).toBeNull();

		const buildPath = await mockAppBuild(options.fingerprintHash);

		const resultWrite = await DiskBuildCacheProvider.uploadBuildCache(
			{ ...options, buildPath },
			args,
		);
		expect(resultWrite).toBeString();

		const resultRead2 = await DiskBuildCacheProvider.resolveBuildCache(options, args);
		expect(resultRead2).toBeString();
	});

	it("should use cacheDir from args when resolving and uploading build cache", async () => {
		const options = { ...baseOptions, fingerprintHash: crypto.randomUUID() };
		const args = { cacheDir: "~/my-cache-dir/" };

		const resultRead1 = await DiskBuildCacheProvider.resolveBuildCache(options, args);
		expect(resultRead1).toBeNull();

		// Create a file to simulate a build output
		const buildPath = await mockAppBuild(options.fingerprintHash);

		const resultWrite = await DiskBuildCacheProvider.uploadBuildCache(
			{ ...options, buildPath },
			args,
		);
		expect(resultWrite).toBeString();
		expect(resultWrite).toInclude(args.cacheDir.replace("~", os.homedir));
	});
});
