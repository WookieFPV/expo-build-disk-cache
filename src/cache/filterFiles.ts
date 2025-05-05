import fs from "node:fs/promises";

const validExtensions = [".apk", ".app"];
export const isValidFile = (filePath: string): boolean =>
	validExtensions.some((ext) => filePath.endsWith(ext));

export const readAppFiles = async (
	directory: string,
	filterFunc = isValidFile,
): Promise<string[]> => {
	const files = await fs.readdir(directory);
	return files.filter(filterFunc);
};
