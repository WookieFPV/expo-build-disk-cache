import type { Result } from "../utils/tryCatch.ts";
import { api } from "./api.ts";
import { apiLogger } from "./apiLogger.ts";

export const getDownloadUrl = async (fileName: string) => {
	const fileResponse = await api.value.GET("/file/{fileName}", {
		params: { path: { fileName } },
	});
	const downloadUrl = fileResponse?.data?.url;
	if (downloadUrl) return downloadUrl;

	if (fileResponse?.response.status === 404) return null;
	apiLogger.log(`🌐 Failed to get download link: ${fileResponse.error}`);
	return null;
};

export const getUploadUrl = async (fileName: string): Promise<Result<string, "exists" | Error>> => {
	const { data, error, response } = await api.value.POST("/file/{fileName}", {
		params: { path: { fileName } },
	});
	if (response.status === 204) return { error: "exists", data: null };
	if (error) {
		apiLogger.log(`🌐 Failed to get upload link: ${error}`);
		throw error;
	}

	const url = data?.url;
	if (url) return { data: url, error: null };
	throw Error("getUploadUrl returned no URL ");
};
