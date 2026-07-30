import os from "node:os";
import path from "node:path";
import { texts } from "../texts.ts";

export type NumberLike = boolean | string | number;
export type BooleanLike = boolean | string | number;

/**
 * Config values come from untrusted sources (config files, env vars, app config), so every parser
 * takes `unknown` and falls back to the default instead of throwing.
 *
 * Problems are collected instead of logged directly, so that getConfig can report all of them at
 * once and the parsers stay pure. (It also keeps this module free of the `logger` -> `config`
 * import cycle.) `label` names the option in those messages and may include where it came from.
 */
export type ConfigIssues = string[];

/**
 * regex specifically targets ~ at the beginning of the string followed by the end of the string or a path separator, preventing unintended replacements.
 */
const regex = /^~(?=$|\/|\\)/;

export const cleanupPath = (cacheDir: string) =>
	path.resolve(cacheDir.replace(regex, os.homedir()));

/** JSON quotes strings, which keeps blank and whitespace-only values visible in a warning. */
const describeValue = (value: unknown): string => {
	if (typeof value === "string" || (typeof value === "object" && value !== null)) {
		try {
			return JSON.stringify(value);
		} catch {
			return Object.prototype.toString.call(value);
		}
	}
	return String(value);
};

const describeFallback = (defaultValue: unknown): string =>
	defaultValue === undefined ? "ignoring it" : `using default: ${String(defaultValue)}`;

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
	typeof value === "object" && value !== null && !Array.isArray(value);

/**
 * Environment variables take precedence over every other config source.
 * An unset or empty env var falls through to the value that was passed in.
 */
export const readEnvValue = <T>(value: T, envName: string): T | string => {
	const envVar = process.env[envName];
	if (envVar) return envVar;
	return value;
};

const TRUE_VALUES = ["true", "1", "yes", "on"];
const FALSE_VALUES = ["false", "0", "no", "off"];

export const parseBooleanLike = (
	value: unknown,
	label: string,
	defaultValue: boolean,
	issues: ConfigIssues = [],
): boolean => {
	// `null` is how JSON/YAML spell "no value", so treat it like an absent key.
	if (value === undefined || value === null) return defaultValue;
	if (typeof value === "boolean") return value;
	if (typeof value === "number" && !Number.isNaN(value)) return value !== 0;

	if (typeof value === "string") {
		const lowerValue = value.trim().toLowerCase();
		if (TRUE_VALUES.includes(lowerValue)) return true;
		if (FALSE_VALUES.includes(lowerValue)) return false;
	}

	issues.push(
		texts.config.invalidBool(label, describeValue(value), describeFallback(defaultValue)),
	);
	return defaultValue;
};

export const parseNumberLike = (
	value: unknown,
	label: string,
	defaultValue: number,
	issues: ConfigIssues = [],
): number => {
	if (value === undefined || value === null) return defaultValue;

	const isNumberLike =
		typeof value === "number" ||
		typeof value === "boolean" ||
		(typeof value === "string" && value.trim() !== "");

	// Number.isFinite also rejects NaN and +/-Infinity, which would silently disable cache cleanup.
	const parsedValue = isNumberLike ? Number(value) : Number.NaN;
	if (!Number.isFinite(parsedValue)) {
		issues.push(
			texts.config.invalidValue(label, describeValue(value), describeFallback(defaultValue)),
		);
		return defaultValue;
	}
	return parsedValue;
};

export const parseStringLike = <T extends string | undefined>(
	value: unknown,
	label: string,
	defaultValue: T,
	issues: ConfigIssues = [],
): string | T => {
	if (value === undefined || value === null) return defaultValue;

	if (typeof value !== "string" || value.trim() === "") {
		issues.push(
			texts.config.invalidValue(label, describeValue(value), describeFallback(defaultValue)),
		);
		return defaultValue;
	}
	return value;
};

export const parseJsonLike = (
	value: unknown,
	label: string,
	defaultValue?: Record<string, unknown>,
	issues: ConfigIssues = [],
): Record<string, unknown> | undefined => {
	if (value === undefined || value === null) return defaultValue;

	let parsedValue: unknown = value;
	if (typeof value === "string") {
		try {
			parsedValue = JSON.parse(value);
		} catch (error) {
			issues.push(
				texts.config.invalidJson(
					label,
					error instanceof Error ? error.message : String(error),
					describeFallback(defaultValue),
				),
			);
			return defaultValue;
		}
	}

	// Applies to both branches: an array or a bare JSON scalar is not a valid options object.
	if (isPlainObject(parsedValue)) return parsedValue;

	issues.push(
		texts.config.invalidValue(label, describeValue(value), describeFallback(defaultValue)),
	);
	return defaultValue;
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
