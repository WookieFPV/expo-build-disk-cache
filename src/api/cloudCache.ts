import path from "node:path";
import envPaths from "env-paths";
import fs from "fs-extra";
import { tryCatch } from "../utils/tryCatch.ts";
import { apiLogger } from "./apiLogger.ts";
import {
	compressFileOrFolder,
	tarGzExtension,
	uncompressTarBall,
} from "./helper/compress.ts";
import { downloadFile } from "./helper/downloadFile.ts";
import { uploadFile } from "./helper/uploadFile.ts";
import { getDownloadUrl, getUploadUrl } from "./presignedUrls.ts";

const defaultDir = envPaths("expo-build-disk-cache", {
	suffix: "download",
}).temp;

const download = async ({
	fileKey,
	downloadDir = defaultDir,
}: { fileKey: string; downloadDir?: string }) => {
	const { data: url, error: fetchError } = await tryCatch(
		getDownloadUrl(fileKey),
	);
	if (fetchError) {
		apiLogger.log(`🌐 Failed to download file: ${fetchError.message}`);
		return null;
	}
	if (!url) return null;
	await tryCatch(fs.mkdir(downloadDir, { recursive: true }));
	const targetPath = path.join(downloadDir, `${fileKey}${tarGzExtension}`);

	apiLogger.log("🌐 Cache hit: remote cache downloading...");
	const { data: tarFile, error } = await tryCatch(
		downloadFile(url, targetPath),
	);
	if (error) {
		apiLogger.log(`🌐 Failed to download file: ${error.message}`);
		return null;
	}
	const { data: apkPath, error: compressErr } = await tryCatch(
		uncompressTarBall(tarFile),
	);
	if (compressErr) {
		apiLogger.log(`🌐 Failed to uncompress file: ${compressErr.message}`);
		return null;
	}
	apiLogger.log("🌐 Cache hit: remote cache downloaded");
	return apkPath;
};

const upload = async ({
	fileKey,
	artifactPath,
}: { fileKey: string; artifactPath: string }) => {
	const upload = await getUploadUrl(fileKey);
	if (upload.error === "exists")
		return apiLogger.log("🌐 Cache update: Already exists in the cloud");
	if (upload.error)
		return apiLogger.log(
			`🌐 Cache update: Failed to get upload link: ${upload.error}`,
		);

	apiLogger.log("🌐 Cache update: uploading...");
	const newPath = path.join(path.dirname(artifactPath), fileKey);

	await fs.rename(artifactPath, newPath);

	const tarPath = await compressFileOrFolder({
		parentPath: path.dirname(artifactPath),
		fileOrFolderName: fileKey,
	});
	await uploadFile(upload.data, tarPath);
	await tryCatch(fs.unlink(tarPath));
	apiLogger.log("🌐 Cache update: Uploaded!");
};

export const cloudCache = {
	download,
	upload,
};
