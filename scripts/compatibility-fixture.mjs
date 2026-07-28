import crypto from "node:crypto";
import fs from "node:fs";
import { createRequire } from "node:module";
import os from "node:os";
import path from "node:path";

const [, , command, consumerRoot, expoConfigVersion, packageTarball] = process.argv;

if (!command || !consumerRoot) {
	throw new Error(
		"Usage: compatibility-fixture.mjs <prepare|verify> <consumer-root> [expo-config-version] [package-tarball]",
	);
}

if (command === "prepare") {
	if (!expoConfigVersion || !packageTarball) {
		throw new Error("prepare requires an Expo config version and package tarball");
	}

	fs.mkdirSync(consumerRoot, { recursive: true });
	fs.writeFileSync(
		path.join(consumerRoot, "package.json"),
		JSON.stringify(
			{
				private: true,
				dependencies: {
					"@expo/config": expoConfigVersion,
					"expo-build-disk-cache": `file:${packageTarball}`,
				},
			},
			null,
			2,
		),
	);
	process.exit(0);
}

if (command !== "verify") {
	throw new Error(`Unknown command: ${command}`);
}

const consumerRequire = createRequire(path.join(consumerRoot, "package.json"));
const libraryModule = consumerRequire("expo-build-disk-cache");
const diskCacheProvider = libraryModule.default ?? libraryModule;
const packageJson = consumerRequire("expo-build-disk-cache/package.json");

if (packageJson.dependencies?.["@expo/cli"] || packageJson.peerDependencies?.["@expo/cli"]) {
	throw new Error("The published package must not depend on @expo/cli");
}

const baseArgs = {
	projectRoot: consumerRoot,
	platform: "android",
	runOptions: {},
	fingerprintHash: crypto.randomUUID(),
};

await diskCacheProvider.resolveBuildCache(baseArgs, {
	cacheDir: path.join(os.tmpdir(), `disk-only-${crypto.randomUUID()}`),
});

if (
	Object.keys(consumerRequire.cache).some((modulePath) => modulePath.includes("getRemotePlugin-"))
) {
	throw new Error("Disk-only caching eagerly loaded remote provider support");
}

function installProvider(packageName, markerName) {
	const providerRoot = path.join(consumerRoot, "node_modules", ...packageName.split("/"));
	fs.mkdirSync(providerRoot, { recursive: true });
	fs.writeFileSync(
		path.join(providerRoot, "package.json"),
		JSON.stringify({ name: packageName, main: "index.js" }),
	);
	fs.writeFileSync(
		path.join(providerRoot, "index.js"),
		`const fs = require("node:fs");
const path = require("node:path");
module.exports = {
  resolveBuildCache: async ({ projectRoot }) => {
    fs.writeFileSync(path.join(projectRoot, ${JSON.stringify(markerName)}), "");
    return null;
  },
  uploadBuildCache: async () => null
};`,
	);
}

installProvider("compatibility-cache-provider", ".custom-provider-loaded");
await diskCacheProvider.resolveBuildCache(
	{ ...baseArgs, fingerprintHash: crypto.randomUUID() },
	{
		cacheDir: path.join(os.tmpdir(), `custom-remote-${crypto.randomUUID()}`),
		remotePlugin: "compatibility-cache-provider",
	},
);

if (!fs.existsSync(path.join(consumerRoot, ".custom-provider-loaded"))) {
	throw new Error("Custom remote provider was not loaded from the consuming project");
}

installProvider("eas-build-cache-provider", ".eas-provider-loaded");
await diskCacheProvider.resolveBuildCache(
	{ ...baseArgs, fingerprintHash: crypto.randomUUID() },
	{
		cacheDir: path.join(os.tmpdir(), `eas-remote-${crypto.randomUUID()}`),
		remotePlugin: "eas",
	},
);

if (!fs.existsSync(path.join(consumerRoot, ".eas-provider-loaded"))) {
	throw new Error("The EAS provider shorthand was not resolved");
}
