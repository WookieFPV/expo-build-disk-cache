import { logger } from "../logger.ts";
import { api } from "./api.ts";

export const getDownloadUrl = async (fileName: string) => {
	const fileResponse = await api.value.GET("/file/{fileName}", {
		params: { path: { fileName } },
	});
	const downloadUrl = fileResponse?.data?.url;
	if (downloadUrl) return downloadUrl;

	if (fileResponse?.response.status === 404) return null;
	logger.log(`💾 Failed to get download link: ${fileResponse.error}`);
	return null;
};

export const getUploadUrl = async (fileName: string) => {
	const { data, error } = await api.value.POST("/file/{fileName}", {
		params: { path: { fileName } },
	});

	const uploadUrl = data?.url;
	if (uploadUrl) return uploadUrl;
	logger.log(`💾 Failed to get upload link: ${error}`);
	throw error;
};
