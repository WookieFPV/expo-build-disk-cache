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
	const { data: url, error: fetchError } = await tryCatch(
		getDownloadUrl(fileName),
	);
	if (fetchError) {
		logger.log(`💾 Failed to download file: ${fetchError.message}`);
		return null;
	}
	if (!url) return null;

	const targetPath = path.join(cacheDir, fileName);

	logger.log("💾 Cache hit: remote cache downloading...");
	const { data: myDir, error } = await tryCatch(downloadFile(url, targetPath));
	if (error) {
		logger.log(`💾 Failed to download file: ${error.message}`);
		return null;
	}
	const { error: compressErr } = await tryCatch(uncompressTarBall(myDir));
	if (compressErr) {
		logger.log(
			`💾 Failed to uncompress downloaded file: ${compressErr.message}`,
		);
		return null;
	}
	return myDir;
};

const upload = async ({ fileName, cacheDir }: CloudCacheArgs) => {
	const url = await getUploadUrl(fileName);
	logger.debug(`Uploading from presigned URL: ${url}`);
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
