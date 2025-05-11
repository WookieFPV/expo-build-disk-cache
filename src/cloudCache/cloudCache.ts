import path from "node:path";
import fs from "fs-extra";
import { compressFileOrFolder, uncompressTarBall } from "../file/compress.ts";
import { downloadFile } from "../file/downloadFile.ts";
import { uploadFile } from "../file/uploadFile.ts";
import { logger } from "../logger.ts";
import { tryCatch } from "../utils/tryCatch.ts";
import { getDownloadUrl, getUploadUrl } from "./presignedUrls.ts";

type CloudCacheArgs = { fileName: string; cacheDir: string };

const download = async ({ fileName, cacheDir }: CloudCacheArgs) => {
	const url = await getDownloadUrl(fileName);
	if (!url) return null;

	const targetPath = path.join(cacheDir, fileName);

	logger.log("💾 Cache hit: remote cache downloading...");
	const { data: myDir, error } = await tryCatch(downloadFile(url, targetPath));
	if (error) {
		logger.log(`💾 Failed to download file: ${error.message}`);
		return null;
	}

	await uncompressTarBall(myDir);
	return myDir;
};

const upload = async ({ fileName, cacheDir }: CloudCacheArgs) => {
	const url = await getUploadUrl(fileName);

	const tarPath = await compressFileOrFolder({
		parentPath: cacheDir,
		fileOrFolderName: fileName,
	});
	await uploadFile(url, tarPath);
	await tryCatch(fs.unlink(tarPath));
};

export const cloudCache = {
	download,
	upload,
};
