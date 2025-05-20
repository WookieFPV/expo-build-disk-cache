import { describe, expect, it } from "bun:test";
import os from "node:os";
import path from "node:path";
import type { ResolveBuildCacheProps } from "@expo/config";
import { file } from "bun";
import env from "env-paths";
import DiskBuildCacheProvider from "../index.ts";

const mockAppBuild = async (fingerprintHash: string) => {
	const tmpDir = env("expo-build-disk-cache", { suffix: "tests" }).temp;
	const appFile = file(path.join(tmpDir, `${fingerprintHash}.apk`));
	await appFile.write("Placeholder for real apk file");
	if (!appFile.name) throw new Error("mockBuild failed");
	return appFile.name;
};

const baseOptions: Omit<ResolveBuildCacheProps, "fingerprintHash"> = {
	platform: "android",
	projectRoot: process.cwd(),
	runOptions: {},
};

describe("Disk Cache Provider", () => {
	it("Run without crashing", async () => {
		const options = { ...baseOptions, fingerprintHash: crypto.randomUUID() };
		const args = { cacheDir: "~/my-cache-dir/" };

		const result = await DiskBuildCacheProvider.resolveBuildCache(options, args);
		expect(result).toBeNull();
	});

	it("Run resolve without crashing when args are undefined", async () => {
		const options = { ...baseOptions, fingerprintHash: crypto.randomUUID() };
		const args = undefined;

		const result = await DiskBuildCacheProvider.resolveBuildCache(options, args);
		expect(result).toBeNull();
	});

	it("Run upload without crashing when args are undefined", async () => {
		const fingerprintHash = crypto.randomUUID();
		const buildPath = await mockAppBuild(fingerprintHash);
		const options = { ...baseOptions, fingerprintHash, buildPath };
		const args = undefined;

		const result = await DiskBuildCacheProvider.uploadBuildCache(options, args);
		expect(result).toBeString();
		expect(result?.endsWith(`/fingerprint.${fingerprintHash}.apk`)).toBeTrue();
	});

	it("save and read builds to disk", async () => {
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

	it("should use cacheDir Config value (cacheDir)", async () => {
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
