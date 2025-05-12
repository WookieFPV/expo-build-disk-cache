import fs from "node:fs/promises";
import { tryCatch } from "../utils/tryCatch.ts";

const validExtensions = [".apk", ".app"];

export const isValidFile = (filePath: string): boolean =>
	validExtensions.some((ext) => filePath.endsWith(ext));

export const readAppFiles = async (
	directory: string,
	filterFunc = isValidFile,
): Promise<string[]> => {
	const { data: files } = await tryCatch(fs.readdir(directory));
	if (!files) return [];
	return files.filter(filterFunc);
};
