import fs from "node:fs/promises";
import path from "node:path";
import { getPackageJson } from "@expo/config";
import envPaths from "env-paths";
import type { RunOptions } from "./types";

export function getTagName({
	fingerprintHash,
	projectRoot,
	runOptions,
}: {
	fingerprintHash: string;
	projectRoot: string;
	runOptions: RunOptions;
}): string {
	const isDevClient = isDevClientBuild({ projectRoot, runOptions });

	return `fingerprint.${fingerprintHash}${isDevClient ? ".dev-client" : ""}`;
}

export function getCachedAppPath({
	fingerprintHash,
	platform,
	projectRoot,
	runOptions,
	cacheDir,
}: {
	fingerprintHash: string;
	projectRoot: string;
	runOptions: RunOptions;
	platform: "ios" | "android" | "web";
	cacheDir?: string;
}): string {
	return path.join(
		cacheDir ?? getBuildRunCacheDirectoryPath(),
		`${getTagName({
			fingerprintHash,
			projectRoot,
			runOptions,
		})}.${platform === "ios" ? "app" : "apk"}`,
	);
}

export function isDevClientBuild({
	runOptions,
	projectRoot,
}: {
	runOptions: RunOptions;
	projectRoot: string;
}): boolean {
	if (!hasDirectDevClientDependency(projectRoot)) {
		return false;
	}

	if ("variant" in runOptions && runOptions["variant"] !== undefined) {
		return runOptions["variant"] === "debug";
	}
	if (
		"configuration" in runOptions &&
		runOptions["configuration"] !== undefined
	) {
		return runOptions["configuration"] === "Debug";
	}

	return true;
}

export function hasDirectDevClientDependency(projectRoot: string): boolean {
	const { dependencies = {}, devDependencies = {} } =
		getPackageJson(projectRoot);
	return (
		!!dependencies["expo-dev-client"] || !!devDependencies["expo-dev-client"]
	);
}

export const getTmpDirectory = (): string =>
	envPaths("disk-cache-provider").temp;

export const getBuildRunCacheDirectoryPath = (): string =>
	path.join(getTmpDirectory(), "build-run-cache");

export async function fileExists(filePath: string) {
	try {
		await fs.access(filePath);
		return true;
	} catch (error) {
		if (error instanceof Error && "code" in error && error.code === "ENOENT")
			return false;

		console.error(
			`An error occurred while checking file: ${error instanceof Error ? error.message : "Unknown error"}`,
		);
		return false;
	}
}
