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

/** Lists the cached build artifacts in a directory, ignoring anything this package did not write. */
export const readAppFiles = async (directory: string): Promise<string[]> => {
	const files = await fs.readdir(directory);
	return files.filter(isValidFile);
};
