import path from "node:path";
import envPaths from "env-paths";
import fs from "fs-extra";
import { create, extract } from "tar";
import { v4 as uuidv4 } from "uuid";
import { logger } from "../logger.ts";
import { tryCatch } from "../utils/tryCatch.ts";

const tmpFolder = envPaths("expo-build-disk-cache_zip", { suffix: "" }).temp;

export const compressFileOrFolder = async ({
	fileOrFolderName,
	parentPath,
}: {
	parentPath: string;
	fileOrFolderName: string;
}): Promise<string> => {
	await tryCatch(fs.mkdir(tmpFolder));
	const tarPath = path.join(tmpFolder, `${uuidv4()}.tar.gz`);
	const fullPath = path.join(parentPath, fileOrFolderName);

	if ((await fs.stat(fullPath)).isFile()) {
		logger.debug("Compressing apk to tar.gz");
		await create({ cwd: parentPath, file: tarPath, gzip: true }, [
			fileOrFolderName,
		]);
		logger.debug(`Compressed apk to path: ${tarPath}`);
		return tarPath;
	}
	if ((await fs.stat(fullPath)).isDirectory()) {
		logger.debug("Compressing folder to tar.gz");
		await create({ cwd: parentPath, file: tarPath, gzip: true }, [
			fileOrFolderName,
		]);
		logger.debug(`Compressed app to path: ${tarPath}`);
		return tarPath;
	}
	throw Error("Invalid file or folder name");
};

/**
 * Uncompress a tarball file in place (if this fails it will not delete the file)
 */
export const uncompressTarBall = async (filePath: string) => {
	try {
		await extract({ cwd: path.dirname(filePath), file: filePath });
	} catch (e) {
		await fs.unlink(filePath); // remove zip file if it fails because our zip files have the normal .apk / .app extension --> the same as the original file
		throw e;
	}
};
