import fs from "node:fs/promises";
import path from "node:path";
import { isValidFile, readAppFiles } from "../cache/filterFiles.ts";
import { logger } from "../logger.ts";

/**
 * Recursively calculates the total size of files within a folder.
 */
export async function getDirectorySize(folderPath: string): Promise<number> {
	let totalSize = 0;

	try {
		const items = await fs.readdir(folderPath);

		for (const item of items) {
			const itemPath = path.join(folderPath, item);
			const stats = await fs.stat(itemPath);

			if (stats.isFile()) {
				totalSize += stats.size;
			} else if (stats.isDirectory()) {
				totalSize += await getDirectorySize(itemPath); // Recursively get size of subfolder
			}
		}

		return totalSize;
	} catch (error) {
		console.error(`Error accessing folder ${folderPath}:`, error);
		throw error;
	}
}

/**
 * Calculates the total size and number of files within a directory and its subdirectories.
 * @param directory The path to the directory.
 * @param filterFunc
 * @returns An object containing the total size in bytes and the total file count.
 */
export const getDirectoryStats = async (
	directory: string,
	filterFunc = isValidFile,
): Promise<{ totalSize: number; fileCount: number }> => {
	let totalSize = 0;
	const fileCountSet = new Set<string>();

	try {
		const files = await readAppFiles(directory, filterFunc);

		for (const file of files) {
			const filePath = path.join(directory, file);
			const stats = await fs.stat(filePath);
			if (stats.isFile()) {
				totalSize += stats.size;
				fileCountSet.add(file);
			} else if (stats.isDirectory()) {
				const { totalSize: subDirSize } = await getDirectoryStats(
					filePath,
					() => true,
				);
				totalSize += subDirSize;
				fileCountSet.add(file);
			}
		}
	} catch (error) {
		logger.error(`Error accessing directory ${directory}:`, error);
	}

	return { totalSize, fileCount: fileCountSet.size };
};
