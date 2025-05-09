import fs from "node:fs/promises";
import { logger } from "../logger.ts";

export const fileExists = async (filePath: string): Promise<boolean> => {
	try {
		await fs.access(filePath);
		return true;
	} catch (error) {
		if (error instanceof Error && "code" in error && error.code === "ENOENT")
			return false;

		logger.error(
			`An error occurred while checking file: ${error instanceof Error ? error.message : "Unknown error"}`,
		);
		return false;
	}
};
