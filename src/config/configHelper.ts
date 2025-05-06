import os from "node:os";
import path from "node:path";
import { z } from "zod";

export const NumberLikeSchema = z.coerce.number();

export const booleanLikeSchema = z.preprocess((value) => {
	if (typeof value === "string") {
		const lowerValue = value.toLowerCase();
		if (lowerValue === "true" || lowerValue === "1" || lowerValue === "yes") {
			return true;
		}
		if (lowerValue === "false" || lowerValue === "0" || lowerValue === "no") {
			return false;
		}
	}
	return value;
}, z.boolean());

/**
 * regex specifically targets ~ at the beginning of the string followed by the end of the string or a path separator, preventing unintended replacements.
 */
const regex = /^~(?=$|\/|\\)/;

export const cleanupPath = (cacheDir: string | undefined) =>
	cacheDir ? path.resolve(cacheDir.replace(regex, os.homedir())) : undefined;

export const handleZodError = <T>(defaultValue: T) => {
	return (ctx: z.core.$ZodCatchCtx) => {
		// Zod V4 Error Handling:
		if ("issues" in ctx && Array.isArray(ctx.issues)) {
			for (const issue of ctx.issues) {
				console.warn(`Invalid config value: ${issue.message}`);
			}
			// Zod V3 Error Handling:
		} else if ("error" in ctx && ctx.error && ctx.error instanceof Error) {
			console.error(`Invalid config file ${ctx.error.message}`);
		}

		return defaultValue;
	};
};
