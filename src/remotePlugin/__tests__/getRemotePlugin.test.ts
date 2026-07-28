import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import type { ResolveBuildCacheProps } from "@expo/config";
import { mockLogger } from "../../__tests__/test-setup.ts";
import { getRemotePlugin } from "../getRemotePlugin.ts";

let projectRoot: string;

const args = (): ResolveBuildCacheProps => ({
	projectRoot,
	platform: "android",
	runOptions: {},
	fingerprintHash: "fingerprint",
});

async function installProvider(packageName: string, source: string) {
	const packageRoot = path.join(projectRoot, "node_modules", ...packageName.split("/"));
	await mkdir(packageRoot, { recursive: true });
	await writeFile(
		path.join(packageRoot, "package.json"),
		JSON.stringify({ name: packageName, main: "index.js" }),
	);
	await writeFile(path.join(packageRoot, "index.js"), source);
}

beforeEach(async () => {
	projectRoot = await mkdtemp(path.join(os.tmpdir(), "expo-disk-cache-provider-"));
	await writeFile(path.join(projectRoot, "package.json"), "{}");
});

afterEach(async () => {
	await rm(projectRoot, { recursive: true, force: true });
});

describe("getRemotePlugin", () => {
	it("resolves a modern provider relative to the consuming project", async () => {
		await installProvider(
			"custom-cache-provider",
			`module.exports = {
				resolveBuildCache: async () => "modern-cache",
				uploadBuildCache: async () => "modern-upload"
			};`,
		);

		const provider = await getRemotePlugin(args(), {
			remotePlugin: "custom-cache-provider",
			remoteOptions: { bucket: "builds" },
		});

		expect(await provider?.resolveBuildCache(args(), {})).toBe("modern-cache");
		expect(await provider?.uploadBuildCache({ ...args(), buildPath: "app.apk" }, {})).toBe(
			"modern-upload",
		);
	});

	it("supports the deprecated remote provider method names", async () => {
		await installProvider(
			"legacy-cache-provider",
			`module.exports = {
				resolveRemoteBuildCache: async () => "legacy-cache",
				uploadRemoteBuildCache: async () => "legacy-upload"
			};`,
		);

		const provider = await getRemotePlugin(args(), {
			remotePlugin: "legacy-cache-provider",
		});

		expect(await provider?.resolveBuildCache(args(), {})).toBe("legacy-cache");
		expect(await provider?.uploadBuildCache({ ...args(), buildPath: "app.apk" }, {})).toBe(
			"legacy-upload",
		);
	});

	it("maps the eas shorthand to eas-build-cache-provider", async () => {
		await installProvider(
			"eas-build-cache-provider",
			`module.exports = {
				resolveBuildCache: async () => "eas-cache",
				uploadBuildCache: async () => null
			};`,
		);

		const provider = await getRemotePlugin(args(), { remotePlugin: "eas" });

		expect(await provider?.resolveBuildCache(args(), {})).toBe("eas-cache");
	});

	it("reports a missing optional provider with an installation command", async () => {
		const provider = await getRemotePlugin(args(), {
			remotePlugin: "missing-cache-provider",
		});

		expect(provider).toBeNull();
		expect(mockLogger.error).toHaveBeenCalledWith(
			expect.stringContaining("npm install --save-dev missing-cache-provider"),
		);
	});

	it("rejects providers that do not implement Expo's provider interface", async () => {
		await installProvider(
			"invalid-cache-provider",
			"module.exports = { resolveBuildCache: async () => null };",
		);

		const provider = await getRemotePlugin(args(), {
			remotePlugin: "invalid-cache-provider",
		});

		expect(provider).toBeNull();
		expect(mockLogger.error).toHaveBeenCalledWith(
			expect.stringContaining('Invalid provider "invalid-cache-provider"'),
		);
	});
});
