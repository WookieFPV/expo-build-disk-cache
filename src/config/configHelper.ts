import os from "node:os";
import path from "node:path";
import { z } from "zod";
import { logger } from "../logger.ts";
import { texts } from "../texts.ts";

export type NumberLike = boolean | string | number;
export const numberLikeSchema = z.coerce.number();

export type BooleanLike = boolean | string | number;
export const booleanLikeSchema = z
	.union([z.boolean(), z.string(), z.number()])
	.transform((value): boolean => {
		if (typeof value === "boolean") return value;
		if (typeof value === "number") return value !== 0;
		const lowerValue = value.toLowerCase();
		if (lowerValue === "true" || lowerValue === "1" || lowerValue === "yes") {
			return true;
		}
		if (lowerValue === "false" || lowerValue === "0" || lowerValue === "no") {
			return false;
		}
		logger.log(texts.config.invalidBool(value));
		return false;
	});

export const jsonLikeSchema = z
	.union([z.object().loose(), z.string()])
	.transform((value): Record<string, unknown> => {
		if (typeof value === "string") return JSON.parse(value) as Record<string, unknown>;
		return value;
	});

/**
 * regex specifically targets ~ at the beginning of the string followed by the end of the string or a path separator, preventing unintended replacements.
 */
const regex = /^~(?=$|\/|\\)/;

export const cleanupPath = (cacheDir: string) =>
	path.resolve(cacheDir.replace(regex, os.homedir()));

/**
 * Zod Error Handling
 * Supports Zod V3 and V4 at the same time
 * @param defaultValue - Default value to return in case of error
 */
export const handleZodError = <T>(defaultValue: T) => {
	return (ctx: z.core.$ZodCatchCtx) => {
		// Zod V4 Error Handling:
		if ("issues" in ctx && Array.isArray(ctx.issues)) {
			for (const issue of ctx.issues) {
				logger.warn(texts.config.invalidValue(issue.message));
			}
			// Zod V3 Error Handling:
		} else if ("error" in ctx && ctx.error && ctx.error instanceof Error) {
			logger.error(texts.config.invalidFile(ctx.error.message));
		}

		return defaultValue;
	};
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

export const createEnvAwareSchema = <T extends z.ZodType>(schema: T, envName: string) =>
	schema
		.optional()
		.transform((val) => {
			const envVar = process.env[envName];
			// biome-ignore lint/suspicious/noExplicitAny: zod will validate the type at runtime
			if (envVar && envVar !== "") return envVar as any;
			return val;
		})
		.pipe(schema);
