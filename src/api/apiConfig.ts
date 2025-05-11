export type ApiConfigInput = {
	cacheDir?: string;
	debug?: string | boolean;
	apiUrl: string;
	apiToken: string;
};

export type ApiConfig = {
	cacheDir?: string;
	debug?: boolean;
	apiUrl: string;
	apiToken: string;
	apiEnabled: boolean;
};

let config: ApiConfig = {
	debug: false,
	apiEnabled: false,
	apiUrl: "",
	apiToken: "",
};

export const getApiConfig = (
	appConfig?: Partial<ApiConfigInput>,
): ApiConfig => {
	if (config && !appConfig) return config;
	if (!appConfig) return config;

	const { apiUrl, apiToken } = appConfig;
	config = {
		debug: appConfig.debug === true || appConfig.debug === "true",
		apiToken: appConfig.apiToken ?? "",
		apiUrl: appConfig.apiUrl ?? "",
		cacheDir: appConfig.cacheDir,
		apiEnabled: !!apiUrl && !!apiToken,
	};
	return config;
};
