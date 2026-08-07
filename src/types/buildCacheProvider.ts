export type AndroidRunOptions = {
	variant?: string;
	device?: boolean | string;
	port?: number;
	bundler?: boolean;
	install?: boolean;
	buildCache?: boolean;
	allArch?: boolean;
	binary?: string;
	appId?: string;
};

export type IosRunOptions = {
	device?: string | boolean;
	port?: number;
	scheme?: string | boolean;
	configuration?: "Debug" | "Release";
	bundler?: boolean;
	install?: boolean;
	buildCache?: boolean;
	binary?: string;
	rebundle?: boolean;
};

export type RunOptions = AndroidRunOptions | IosRunOptions;

export type ResolveBuildCacheProps = {
	projectRoot: string;
	platform: "android" | "ios";
	runOptions: RunOptions;
	fingerprintHash: string;
};

export type UploadBuildCacheProps = ResolveBuildCacheProps & {
	buildPath: string;
};

export type BuildCacheProviderPlugin<T = unknown> = {
	calculateFingerprintHash?: (
		props: Pick<ResolveBuildCacheProps, "projectRoot" | "platform" | "runOptions">,
		options: T,
	) => Promise<string | null>;
} & (
	| {
			resolveBuildCache(props: ResolveBuildCacheProps, options: T): Promise<string | null>;
			uploadBuildCache(props: UploadBuildCacheProps, options: T): Promise<string | null>;
	  }
	| {
			resolveRemoteBuildCache(props: ResolveBuildCacheProps, options: T): Promise<string | null>;
			uploadRemoteBuildCache(props: UploadBuildCacheProps, options: T): Promise<string | null>;
	  }
);

export type BuildCacheProvider<T = unknown> = {
	plugin: BuildCacheProviderPlugin<T>;
	options: T;
};
