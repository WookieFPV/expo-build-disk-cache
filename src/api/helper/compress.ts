import path from "node:path";
import envPaths from "env-paths";
import fs from "fs-extra";
import { create, extract } from "tar";
import { v4 as uuidv4 } from "uuid";
import { tryCatch } from "../../utils/tryCatch.ts";
import { apiLogger } from "../apiLogger.ts";

const tmpFolder = envPaths("expo-build-disk-cache_zip", { suffix: "" }).temp;

export const tarGzExtension = ".tar.gz";

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
		apiLogger.debug("Compressing apk to tar.gz");
		await create({ cwd: parentPath, file: tarPath, gzip: true }, [fileOrFolderName]);
		apiLogger.debug(`Compressed apk to path: ${tarPath}`);
		return tarPath;
	}
	if ((await fs.stat(fullPath)).isDirectory()) {
		apiLogger.debug("Compressing folder to tar.gz");
		await create({ cwd: parentPath, file: tarPath, gzip: true }, [fileOrFolderName]);
		apiLogger.debug(`Compressed app to path: ${tarPath}`);
		return tarPath;
	}
	throw Error("Invalid file or folder name");
};

/**
 * Uncompress a tarball file in place (if this fails it will not delete the file)
 */
export const uncompressTarBall = async (filePath: string) => {
	const extractedPath = filePath.replace(/\.tar\.gz$/, "");
	try {
		await extract({ cwd: path.dirname(filePath), file: filePath });
		void tryCatch(fs.unlink(filePath)); // <-- not awaited because we don't care
		return extractedPath;
	} catch (e) {
		// Delete potentially corrupted files:
		await tryCatch(fs.unlink(filePath));
		await tryCatch(fs.unlink(extractedPath));
		throw e;
	}
};
