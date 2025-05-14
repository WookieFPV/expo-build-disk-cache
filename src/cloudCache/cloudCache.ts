import path from "node:path";
import fs from "fs-extra";
import {
	compressFileOrFolder,
	tarGzExtension,
	uncompressTarBall,
} from "../file/compress.ts";
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

	await tryCatch(fs.mkdir(cacheDir, { recursive: true }));
	const targetPath = path.join(cacheDir, `${fileName}${tarGzExtension}`);

	logger.log("💾 Cache hit: remote cache downloading...");
	const { data: tarFile, error } = await tryCatch(
		downloadFile(url, targetPath),
	);
	if (error) {
		logger.log(`💾 Failed to download file: ${error.message}`);
		return null;
	}
	const { data: apkPath, error: compressErr } = await tryCatch(
		uncompressTarBall(tarFile),
	);
	if (compressErr) {
		logger.log(`💾 Failed to uncompress file: ${compressErr.message}`);
		return null;
	}
	logger.log("💾 Cache hit: remote cache downloaded");
	return apkPath;
};

const upload = async ({ fileName, cacheDir }: CloudCacheArgs) => {
	const upload = await getUploadUrl(fileName);
	if (upload.error === "exists")
		return logger.log("💾 Cache update: Already exists in the cloud");
	if (upload.error)
		return logger.log(
			`💾 Cache update: Failed to get upload link: ${upload.error}`,
		);

	logger.log("💾 Cache update: uploading...");
	const tarPath = await compressFileOrFolder({
		parentPath: cacheDir,
		fileOrFolderName: fileName,
	});
	await uploadFile(upload.data, tarPath);
	await tryCatch(fs.unlink(tarPath));
	logger.log("💾 Cache update: Uploaded!");
};

export const cloudCache = {
	download,
	upload,
};
