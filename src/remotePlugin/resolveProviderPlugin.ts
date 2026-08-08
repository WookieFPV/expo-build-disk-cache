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

/** A `require` anchored in the project, so plugins resolve out of the project's node_modules. */
const requireFromProject = (projectRoot: string) =>
	createRequire(path.join(path.resolve(projectRoot), "noop.js"));

/**
 * Expo splits this into a direct-file-reference branch and a package-reference branch, but both
 * end in the same `resolve-from` call, so a single `require.resolve` covers both cases (and, like
 * Expo, leaves subpath resolution to the package's `exports`/`main`).
 */
const resolvePluginFilePath = (projectRoot: string, pluginReference: string): string | null => {
	try {
		return requireFromProject(projectRoot).resolve(pluginReference);
	} catch {
		return null;
	}
};

/**
 * A literal `import()` is rewritten to `require()` by the CJS build, which would defeat the ESM
 * fallback below; building the import through `Function` keeps it a real dynamic import. Built
 * lazily so that a runtime which forbids code generation only breaks this fallback, rather than
 * failing to load the module at all.
 */
const dynamicImport = (specifier: string): Promise<unknown> =>
	(new Function("s", "return import(s)") as (s: string) => Promise<unknown>)(specifier);

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
 * Digs through `export default` / `module.exports.default` interop wrappers (an ESM namespace
 * around a transpiled CJS module nests them twice) to find the plugin. Unwrapping stops at the
 * first value that validates, so a plugin carrying its own `default` key is never unwrapped past.
 */
const toProviderPlugin = (value: unknown): BuildCacheProviderPlugin<unknown> | null => {
	let candidate = value;
	for (let depth = 0; depth <= 2; depth++) {
		if (isProviderPlugin(candidate)) return candidate;
		if (typeof candidate !== "object" || candidate === null || !("default" in candidate))
			return null;
		candidate = candidate.default;
	}
	return null;
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

	const plugin = toProviderPlugin(await importPluginFile(projectRoot, pluginFile));
	if (!plugin) {
		throw new Error(
			`The provider plugin "${reference}" must export an object containing the resolveBuildCache and uploadBuildCache functions.`,
		);
	}
	return plugin;
};
