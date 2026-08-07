import fs from "node:fs";
import path from "node:path";
import type { ResolveBuildCacheProps } from "./types/buildCacheProvider.ts";

export const filePrefix = "fingerprint.";
export const devClientSuffix = ".dev-client";

export function getTagName({
	fingerprintHash,
	projectRoot,
	runOptions,
}: Pick<ResolveBuildCacheProps, "fingerprintHash" | "projectRoot" | "runOptions">): string {
	const isDevClient = isDevClientBuild({ projectRoot, runOptions });

	return `${filePrefix}${fingerprintHash}${isDevClient ? devClientSuffix : ""}`;
}

interface GetAppPath extends ResolveBuildCacheProps {
	cacheDir: string;
}

export function getCachedAppPath({
	fingerprintHash,
	platform,
	projectRoot,
	runOptions,
	cacheDir,
}: GetAppPath): string {
	return path.resolve(
		path.join(
			path.resolve(cacheDir),
			getFileName({ runOptions, projectRoot, fingerprintHash, platform }),
		),
	);
}

export const getFileName = ({
	fingerprintHash,
	projectRoot,
	runOptions,
	platform,
}: ResolveBuildCacheProps) =>
	`${getTagName({
		fingerprintHash,
		projectRoot,
		runOptions,
	})}.${platform === "ios" ? "app" : "apk"}`;

export function isDevClientBuild({
	runOptions,
	projectRoot,
}: Pick<ResolveBuildCacheProps, "projectRoot" | "runOptions">): boolean {
	if (!hasDirectDevClientDependency(projectRoot)) {
		return false;
	}

	if ("variant" in runOptions && runOptions["variant"] !== undefined) {
		return runOptions["variant"] === "debug";
	}
	if ("configuration" in runOptions && runOptions["configuration"] !== undefined) {
		return runOptions["configuration"] === "Debug";
	}

	return true;
}

export function hasDirectDevClientDependency(projectRoot: string): boolean {
	const packageJson = JSON.parse(
		fs.readFileSync(path.join(projectRoot, "package.json"), "utf8"),
	) as {
		dependencies?: Record<string, string>;
		devDependencies?: Record<string, string>;
	};
	const { dependencies = {}, devDependencies = {} } = packageJson;
	return !!dependencies["expo-dev-client"] || !!devDependencies["expo-dev-client"];
}
