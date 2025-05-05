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
		for (const issue of ctx.issues) {
			console.warn(`Invalid config value: ${issue.message}`);
		}
		return defaultValue;
	};
};
