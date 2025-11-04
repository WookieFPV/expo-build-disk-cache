import { describe, expect, it } from "bun:test";
import os from "node:os";
import path from "node:path";
import type { ResolveBuildCacheProps } from "@expo/config";
import { file } from "bun";
import type { Config } from "../config/config.ts";
import DiskBuildCacheProvider from "../index.ts";
import { mockAppBuild } from "./mockAppBuild.ts";

// Define a temporary directory for tests
const TEMP_DIR = path.join(os.tmpdir(), "disk-cache-test");

const baseOptions: Omit<ResolveBuildCacheProps, "fingerprintHash"> = {
	platform: "android",
	projectRoot: process.cwd(),
	runOptions: {},
};

describe("uploadBuildCache", () => {
	it("should return null when args are undefined and buildPath is missing", async () => {
		const args = undefined;
		const fingerprintHash = crypto.randomUUID();

		const result = await DiskBuildCacheProvider.uploadBuildCache(
			{
				...baseOptions,
				fingerprintHash,
				buildPath: "non-existent-build.apk",
			},
			args,
		);
		expect(result).toBeNull();
	});

	it("should save the build cache and return the path when args are undefined and buildPath exists", async () => {
		const args = undefined;
		const fingerprintHash = crypto.randomUUID();
		const buildPath = await mockAppBuild(fingerprintHash);
		const result = await DiskBuildCacheProvider.uploadBuildCache(
			{
				...baseOptions,
				fingerprintHash,
				buildPath,
			},
			args,
		);
		expect(result).toBeString();
		expect(result?.endsWith(`/fingerprint.${fingerprintHash}.apk`)).toBeTrue();

		const appFile = file(result as string);
		expect(await appFile.exists()).toBeTrue();
	});

	it("should return null when a custom cacheDir is provided in args but buildPath is missing", async () => {
		const customCacheDir = path.join(TEMP_DIR, "my-custom-cache-dir");
		const args = { cacheDir: customCacheDir } satisfies Partial<Config>; // Use the temp dir for the custom path
		const fingerprintHash = crypto.randomUUID();

		const result = await DiskBuildCacheProvider.uploadBuildCache(
			{
				...baseOptions,
				fingerprintHash,
				buildPath: "non-existent-build.apk",
			},
			args,
		);
		expect(result).toBeNull();
	});

	it("should save the build cache to the custom cacheDir when provided in args and buildPath exists", async () => {
		const customCacheDir = path.join(TEMP_DIR, "my-custom-cache-dir");
		const args = { cacheDir: customCacheDir } satisfies Partial<Config>;
		const fingerprintHash = crypto.randomUUID();
		const buildPath = await mockAppBuild(fingerprintHash);
		const result = await DiskBuildCacheProvider.uploadBuildCache(
			{
				...baseOptions,
				fingerprintHash,
				buildPath,
			},
			args,
		);
		expect(result).toBeString();
		expect(result).toInclude(args.cacheDir.replace("~", os.homedir));
		expect(result?.endsWith(`/fingerprint.${fingerprintHash}.apk`)).toBeTrue();

		const appFile = file(result as string);
		expect(await appFile.exists()).toBeTrue();
	});

	it("should return null when buildPath is an empty string", async () => {
		const args: Partial<Config> = { cacheDir: "~/my-cache-dir/" };

		const result = await DiskBuildCacheProvider.uploadBuildCache(
			{
				...baseOptions,
				fingerprintHash: crypto.randomUUID(),
				buildPath: "",
			},
			args,
		);
		expect(result).toBeNull();
	});

	it("should save the build cache when args is an empty object and buildPath exists", async () => {
		const fingerprintHash = crypto.randomUUID();
		const buildPath = await mockAppBuild(fingerprintHash);
		const options = { ...baseOptions, fingerprintHash, buildPath };
		const args = {};

		const result = await DiskBuildCacheProvider.uploadBuildCache(options, args);
		expect(result).toBeString();
		expect(result?.endsWith(`/fingerprint.${fingerprintHash}.apk`)).toBeTrue();
		const appFile = file(result as string);
		expect(await appFile.exists()).toBeTrue();
	});
});
