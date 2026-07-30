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
		loadError: (remotePlugin: string | undefined) =>
			`💾[remote] failed to load plugin "${remotePlugin}"`,
	},
	config: {
		invalidBool: (label: string, value: string, fallback: string) =>
			`💾 Invalid boolean for ${label}: ${value} (${fallback})`,
		invalidValue: (label: string, value: string, fallback: string) =>
			`💾 Invalid value for ${label}: ${value} (${fallback})`,
		invalidJson: (label: string, message: string, fallback: string) =>
			`💾 Invalid JSON for ${label}: ${message} (${fallback})`,
	},
};
