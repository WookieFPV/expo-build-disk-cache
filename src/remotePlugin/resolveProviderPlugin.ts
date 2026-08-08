/**
 * Local re-implementation of `@expo/cli`'s `resolveBuildCacheProvider`.
 *
 * We used to import it from `@expo/cli/build/src/utils/build-cache-providers/index`, which is an
 * internal, unversioned path inside a package that ships a new major with every Expo SDK. Doing
 * the module resolution ourselves keeps this package working across Expo releases and removes the
 * `@expo/cli` peer dependency (which package managers with auto-installed peers would otherwise
 * pull in at a version unrelated to the one the project's Expo SDK pins).
 *
 * The resolution rules mirror Expo's so that a `remotePlugin` value that works with `expo run`
 * keeps working here:
 *   1. `./file.js`, `pkg/file.js` or `@org/pkg/file.js` are resolved as a direct file reference.
 *   2. `pkg` or `@org/pkg` are resolved through the package's entry point.
 */
import { createRequire } from "node:module";
import path from "node:path";
import { pathToFileURL } from "node:url";
import type { BuildCacheProviderPlugin } from "../types/buildCacheProvider.ts";

/** The package Expo uses for its built-in `"eas"` provider. */
const EAS_PROVIDER_PACKAGE = "eas-build-cache-provider";

/** Matches lines starting with `.`, `/` or `~/`, or any reference containing a subpath. */
const moduleNameIsDirectFileReference = (name: string): boolean => {
	if (/^(\.|~\/|\/)/.test(name)) return true;
	const slashCount = name.split("/").length;
	// Scoped packages (like `@org/pkg`) need more than one slash to be a direct file reference.
	return name.startsWith("@") ? slashCount > 2 : slashCount > 1;
};

const moduleNameIsPackageReference = (name: string): boolean => {
	const slashCount = name.split("/").length;
	return name.startsWith("@") ? slashCount === 2 : slashCount === 1;
};

/** A `require` anchored in the project, so plugins resolve out of the project's node_modules. */
const requireFromProject = (projectRoot: string) =>
	createRequire(path.join(path.resolve(projectRoot), "noop.js"));

const resolvePluginFilePath = (projectRoot: string, pluginReference: string): string | null => {
	const projectRequire = requireFromProject(projectRoot);
	try {
		if (moduleNameIsDirectFileReference(pluginReference)) {
			return projectRequire.resolve(pluginReference);
		}
		if (moduleNameIsPackageReference(pluginReference)) {
			return projectRequire.resolve(pluginReference);
		}
	} catch {
		return null;
	}
	return null;
};

/**
 * A literal `import()` is rewritten to `require()` by the CJS build, which would defeat the ESM
 * fallback below. Building the import through `Function` keeps it a real dynamic import.
 */
const dynamicImport = new Function("specifier", "return import(specifier)") as (
	specifier: string,
) => Promise<unknown>;

/**
 * `require` first (that is what Expo does, and it keeps CJS plugins synchronous-ish), falling back
 * to `import()` so an ESM-only provider plugin still loads on Node versions without `require(esm)`.
 */
const importPluginFile = async (projectRoot: string, pluginFile: string): Promise<unknown> => {
	const projectRequire = requireFromProject(projectRoot);
	try {
		return projectRequire(pluginFile);
	} catch (error) {
		const code = (error as NodeJS.ErrnoException | undefined)?.code;
		if (code !== "ERR_REQUIRE_ESM" && code !== "ERR_REQUIRE_ASYNC_MODULE") throw error;
		return await dynamicImport(pathToFileURL(pluginFile).href);
	}
};

/** Unwraps `export default` / `module.exports.default` interop wrappers. */
const unwrapDefault = (value: unknown): unknown => {
	let plugin = value;
	// Two levels: an ESM namespace of a transpiled CJS module nests `default.default`.
	for (let i = 0; i < 2; i++) {
		if (plugin && typeof plugin === "object" && "default" in plugin && plugin.default != null) {
			plugin = plugin.default;
		}
	}
	return plugin;
};

const isProviderPlugin = (plugin: unknown): plugin is BuildCacheProviderPlugin<unknown> => {
	if (typeof plugin !== "object" || plugin === null) return false;
	const candidate = plugin as Record<string, unknown>;
	const canResolve =
		typeof candidate["resolveBuildCache"] === "function" ||
		typeof candidate["resolveRemoteBuildCache"] === "function";
	const canUpload =
		typeof candidate["uploadBuildCache"] === "function" ||
		typeof candidate["uploadRemoteBuildCache"] === "function";
	return canResolve && canUpload;
};

/**
 * Resolves a `remotePlugin` config value to a provider plugin.
 *
 * Unlike `expo run`, this never installs anything into the project: if `"eas"` is configured but
 * `eas-build-cache-provider` is not installed, this throws instead of mutating the project.
 */
export const resolveProviderPlugin = async (
	projectRoot: string,
	pluginReference: string,
): Promise<BuildCacheProviderPlugin<unknown>> => {
	const reference = pluginReference === "eas" ? EAS_PROVIDER_PACKAGE : pluginReference;

	const pluginFile = resolvePluginFilePath(projectRoot, reference);
	if (!pluginFile) {
		throw new Error(
			`Failed to resolve provider plugin "${reference}" relative to "${projectRoot}".` +
				(reference === EAS_PROVIDER_PACKAGE
					? ` Install it with \`npx expo install --dev ${EAS_PROVIDER_PACKAGE}\`.`
					: " Do you have node modules installed?"),
		);
	}

	const plugin = unwrapDefault(await importPluginFile(projectRoot, pluginFile));
	if (!isProviderPlugin(plugin)) {
		throw new Error(
			`The provider plugin "${reference}" must export an object containing the resolveBuildCache and uploadBuildCache functions.`,
		);
	}
	return plugin;
};
