import os from "node:os";
import path from "node:path";
import { logger } from "../logger.ts";
import { texts } from "../texts.ts";

export type NumberLike = boolean | string | number;
export type BooleanLike = boolean | string | number;

/**
 * regex specifically targets ~ at the beginning of the string followed by the end of the string or a path separator, preventing unintended replacements.
 */
const regex = /^~(?=$|\/|\\)/;

export const cleanupPath = (cacheDir: string) =>
	path.resolve(cacheDir.replace(regex, os.homedir()));

export const readEnvValue = <T>(value: T | undefined, envName: string): T | string | undefined => {
	const envVar = process.env[envName];
	if (envVar && envVar !== "") return envVar;
	return value;
};

export const parseBooleanLike = (
	value: BooleanLike | undefined,
	defaultValue: boolean,
): boolean => {
	if (value === undefined) return defaultValue;
	if (typeof value === "boolean") return value;
	if (typeof value === "number") return value !== 0;

	const lowerValue = value.toLowerCase();
	if (lowerValue === "true" || lowerValue === "1" || lowerValue === "yes") return true;
	if (lowerValue === "false" || lowerValue === "0" || lowerValue === "no") return false;

	logger.log(texts.config.invalidBool(value));
	return defaultValue;
};

export const parseNumberLike = (value: NumberLike | undefined, defaultValue: number): number => {
	if (value === undefined) return defaultValue;
	const parsedValue = Number(value);
	if (Number.isNaN(parsedValue)) {
		logger.warn(texts.config.invalidValue(String(value)));
		return defaultValue;
	}
	return parsedValue;
};

export const parseJsonLike = (
	value: Record<string, unknown> | string | undefined,
	defaultValue: Record<string, unknown> | undefined,
): Record<string, unknown> | undefined => {
	if (value === undefined) return defaultValue;
	if (typeof value !== "string") return value;

	try {
		const parsedValue: unknown = JSON.parse(value);
		if (parsedValue && typeof parsedValue === "object" && !Array.isArray(parsedValue)) {
			return parsedValue as Record<string, unknown>;
		}
		logger.warn(texts.config.invalidValue(value));
		return defaultValue;
	} catch (error) {
		logger.error(texts.config.invalidFile(error instanceof Error ? error.message : String(error)));
		return defaultValue;
	}
};

const FILE_EXTENSIONS = ["json", "yaml", "yml"];

/**
 * Helper function to generate config file paths for each file extension
 */
export const configFilePaths = (...paths: string[]) => {
	if (paths.length === 0) return [];
	const inputPath = path.join(...paths);

	// Path must be relative to the home directory for cosmiconfig package
	if (path.isAbsolute(inputPath)) {
		const relativeBase = path.relative(os.homedir(), inputPath);
		return FILE_EXTENSIONS.map((ext) => `${relativeBase}.${ext}`);
	}
	return FILE_EXTENSIONS.map((ext) => `${inputPath}.${ext}`);
};
