import fs from "node:fs/promises";
import path from "node:path";
import { filePrefix } from "../buildCache.ts";

const validExtensions = [".apk", ".app"];

/**
 * Checks if a file is a valid-cached app artifact
 */
export const isValidFile = (filePath: string): boolean => {
	const fileName = path.basename(filePath);
	return fileName.startsWith(filePrefix) && validExtensions.some((ext) => filePath.endsWith(ext));
};

export const readAppFiles = async (
	directory: string,
	filterFunc = isValidFile,
): Promise<string[]> => {
	const files = await fs.readdir(directory);
	return files.filter(filterFunc);
};
