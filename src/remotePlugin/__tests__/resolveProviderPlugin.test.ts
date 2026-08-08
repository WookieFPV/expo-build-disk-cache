import { describe, expect, it } from "bun:test";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { resolveProviderPlugin } from "../resolveProviderPlugin.ts";

const validPluginSource = `
module.exports = {
  resolveBuildCache: async () => "/resolved",
  uploadBuildCache: async () => "/uploaded",
};
`;

/** Creates a temp project, lets the test populate it, and cleans it up afterwards. */
async function withProject(
	files: Record<string, string>,
	test: (projectRoot: string) => void | Promise<void>,
) {
	const projectRoot = await fs.realpath(
		await fs.mkdtemp(path.join(os.tmpdir(), "expo-disk-cache-plugin-")),
	);
	try {
		for (const [file, content] of Object.entries(files)) {
			const filePath = path.join(projectRoot, file);
			await fs.mkdir(path.dirname(filePath), { recursive: true });
			await fs.writeFile(filePath, content);
		}
		await test(projectRoot);
	} finally {
		await fs.rm(projectRoot, { recursive: true, force: true });
	}
}

/** Files that make `name` resolvable as an installed package exporting a valid plugin. */
const nodeModule = (name: string, source = validPluginSource) => ({
	[`node_modules/${name}/package.json`]: JSON.stringify({
		name,
		version: "1.0.0",
		main: "index.js",
	}),
	[`node_modules/${name}/index.js`]: source,
});

describe("resolveProviderPlugin", () => {
	it("resolves a package reference from the project's node_modules", async () => {
		await withProject(nodeModule("my-cache-provider"), async (projectRoot) => {
			const plugin = await resolveProviderPlugin(projectRoot, "my-cache-provider");
			expect("resolveBuildCache" in plugin).toBeTrue();
		});
	});

	it("resolves a scoped package reference", async () => {
		await withProject(nodeModule("@org/cache-provider"), async (projectRoot) => {
			const plugin = await resolveProviderPlugin(projectRoot, "@org/cache-provider");
			expect("uploadBuildCache" in plugin).toBeTrue();
		});
	});

	it("resolves a direct file reference", async () => {
		await withProject({ "provider.js": validPluginSource }, async (projectRoot) => {
			const plugin = await resolveProviderPlugin(projectRoot, "./provider.js");
			expect("resolveBuildCache" in plugin).toBeTrue();
		});
	});

	it("resolves a subpath file reference inside a package", async () => {
		await withProject(
			{ "node_modules/pkg/package.json": "{}", "node_modules/pkg/provider.js": validPluginSource },
			async (projectRoot) => {
				const plugin = await resolveProviderPlugin(projectRoot, "pkg/provider.js");
				expect("resolveBuildCache" in plugin).toBeTrue();
			},
		);
	});

	it("unwraps a default export", async () => {
		await withProject(
			nodeModule(
				"default-export-provider",
				`module.exports.default = { resolveBuildCache: async () => null, uploadBuildCache: async () => null };`,
			),
			async (projectRoot) => {
				const plugin = await resolveProviderPlugin(projectRoot, "default-export-provider");
				expect("resolveBuildCache" in plugin).toBeTrue();
			},
		);
	});

	it("does not unwrap past a valid plugin that has its own default key", async () => {
		await withProject(
			nodeModule(
				"default-key-provider",
				`module.exports = {
				  resolveBuildCache: async () => "/resolved",
				  uploadBuildCache: async () => "/uploaded",
				  default: { nope: true },
				};`,
			),
			async (projectRoot) => {
				const plugin = await resolveProviderPlugin(projectRoot, "default-key-provider");
				expect("resolveBuildCache" in plugin).toBeTrue();
			},
		);
	});

	it("loads an ESM-only provider plugin", async () => {
		await withProject(
			{
				"node_modules/esm-provider/package.json": JSON.stringify({
					name: "esm-provider",
					version: "1.0.0",
					type: "module",
					main: "index.js",
				}),
				"node_modules/esm-provider/index.js": `export default { resolveBuildCache: async () => null, uploadBuildCache: async () => null };`,
			},
			async (projectRoot) => {
				const plugin = await resolveProviderPlugin(projectRoot, "esm-provider");
				expect("resolveBuildCache" in plugin).toBeTrue();
			},
		);
	});

	it("accepts the deprecated resolveRemoteBuildCache/uploadRemoteBuildCache shape", async () => {
		await withProject(
			nodeModule(
				"legacy-provider",
				`module.exports = { resolveRemoteBuildCache: async () => null, uploadRemoteBuildCache: async () => null };`,
			),
			async (projectRoot) => {
				const plugin = await resolveProviderPlugin(projectRoot, "legacy-provider");
				expect("resolveRemoteBuildCache" in plugin).toBeTrue();
			},
		);
	});

	it("maps the built-in 'eas' provider to eas-build-cache-provider", async () => {
		await withProject(nodeModule("eas-build-cache-provider"), async (projectRoot) => {
			const plugin = await resolveProviderPlugin(projectRoot, "eas");
			expect("resolveBuildCache" in plugin).toBeTrue();
		});
	});

	it("throws with an install hint when the eas provider is not installed", async () => {
		await withProject({ "package.json": "{}" }, async (projectRoot) => {
			await expect(resolveProviderPlugin(projectRoot, "eas")).rejects.toThrow(
				/eas-build-cache-provider/,
			);
		});
	});

	it("throws when the plugin cannot be resolved", async () => {
		await withProject({ "package.json": "{}" }, async (projectRoot) => {
			await expect(resolveProviderPlugin(projectRoot, "does-not-exist")).rejects.toThrow(
				/Failed to resolve provider plugin/,
			);
		});
	});

	it("throws when the resolved module is not a provider plugin", async () => {
		await withProject(
			nodeModule("not-a-provider", `module.exports = { hello: "world" };`),
			async (projectRoot) => {
				await expect(resolveProviderPlugin(projectRoot, "not-a-provider")).rejects.toThrow(
					/must export an object/,
				);
			},
		);
	});
});
