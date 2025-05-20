import path from "node:path";
import type { ResolveBuildCacheProps } from "@expo/config";
import { getPackageJson } from "@expo/config";

export function getTagName({
	fingerprintHash,
	projectRoot,
	runOptions,
}: Pick<ResolveBuildCacheProps, "fingerprintHash" | "projectRoot" | "runOptions">): string {
	const isDevClient = isDevClientBuild({ projectRoot, runOptions });

	return `fingerprint.${fingerprintHash}${isDevClient ? ".dev-client" : ""}`;
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
	return path.join(
		path.resolve(cacheDir),
		getFileName({ runOptions, projectRoot, fingerprintHash, platform }),
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
	const { dependencies = {}, devDependencies = {} } = getPackageJson(projectRoot);
	return !!dependencies["expo-dev-client"] || !!devDependencies["expo-dev-client"];
}
