export const texts = {
	read: {
		miss: "💾 No cached build found on disk",
		hit: "💾 Using cached build from disk",
		downloadError: (e: unknown) => `💾 Failed to download build: ${e}`,
		error: (e: unknown) => `💾 Failed to read cache: ${e}`,
	},
	write: {
		alreadySaved: "💾 Cached build was already saved",
		savedToDisk: (path: string) => `💾 Saved build output to disk: ${path}`,
		remoteError: "💾 Build uploading failed!",
		error: (path: string, error: unknown) =>
			`💾 Failed to save build output to disk at ${path}: ${
				error instanceof Error ? error.message : "Unknown error"
			}`,
	},
	remotePlugin: {
		missing: (remotePlugin: string, projectRoot: string) =>
			`💾[remote] Optional provider "${remotePlugin}" was not found from "${projectRoot}". Install it with: npm install --save-dev ${remotePlugin}`,
		loadError: (remotePlugin: string, error: unknown) =>
			`💾[remote] Failed to load provider "${remotePlugin}": ${
				error instanceof Error ? error.message : String(error)
			}`,
		invalid: (remotePlugin: string) =>
			`💾[remote] Invalid provider "${remotePlugin}". It must export resolveBuildCache and uploadBuildCache functions.`,
	},
	config: {
		invalidBool: (value: string) => `Invalid boolean-like value: ${value}`,
		invalidValue: (value: string | undefined) => `Invalid config value: ${value}`,
		invalidFile: (value: string | undefined) => `Invalid config file: ${value}`,
	},
};
