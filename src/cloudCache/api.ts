import createClient, { type Middleware } from "openapi-fetch";
import { getConfig } from "../config/config.ts";
import { logger } from "../logger.ts";
import { Lazy } from "../utils/lazy.ts";
import type { paths } from "./apiTypes";

export const createApiClient = () => {
	const baseUrl = getConfig().apiUrl;
	if (!baseUrl)
		throw new Error("expo-build-disk-cache: baseUrl is required fo API Calls");

	const apiClient = createClient<paths>({ baseUrl });

	const authMiddleware: Middleware = {
		async onRequest({ request }) {
			const apiToken = getConfig().apiToken;
			if (!apiToken) {
				logger.log("expo-build-disk-cache: missing apiToken in config");
				throw new Error("expo-build-disk-cache: missing apiToken in config");
			}
			request.headers.set("Authorization", `Bearer ${apiToken}`);
			return request;
		},
	};

	const logMiddleware: Middleware = {
		onRequest({ request }) {
			const url = request.url.replace(baseUrl, "");
			logger.debug(`[API] ${request.method} ${url} [onRequest]`);
			return request;
		},
		onResponse({ request, response }) {
			const url = request.url.replace(baseUrl, "");
			logger.debug(
				`[API] ${request.method} ${url} status: ${response.status} [onResponse]\n`,
			);
		},
		onError({ request, error }) {
			const url = request.url.replace(baseUrl, "");
			logger.debug(`[API] ${request.method} ${url} error ${error} [onError]\n`);
		},
	};

	apiClient.use(authMiddleware, logMiddleware);

	return apiClient;
};

// Lazily create the API client to avoid race conditions (config loading) and unnecessary initialization
export const api = Lazy(createApiClient);
