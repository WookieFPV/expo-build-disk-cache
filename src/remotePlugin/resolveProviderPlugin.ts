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
import type {
	BuildCacheProviderPlugin,
	ResolveBuildCacheProps,
	UploadBuildCacheProps,
} from "../types/buildCacheProvider.ts";

/** The package Expo uses for its built-in `"eas"` provider. */
const EAS_PROVIDER_PACKAGE = "eas-build-cache-provider";

/**
 * A provider plugin with the two accepted method shapes (current and deprecated `*Remote*` names)
 * normalized to the current one.
 */
export type ResolvedProviderPlugin = {
	resolveBuildCache: (props: ResolveBuildCacheProps, options: unknown) => Promise<string | null>;
	uploadBuildCache: (props: UploadBuildCacheProps, options: unknown) => Promise<string | null>;
	calculateFingerprintHash?: BuildCacheProviderPlugin<unknown>["calculateFingerprintHash"];
};

/** A `require` anchored in the project, so plugins resolve out of the project's node_modules. */
const requireFromProject = (projectRoot: string) =>
	createRequire(path.join(path.resolve(projectRoot), "noop.js"));

/**
 * Expo splits this into a direct-file-reference branch and a package-reference branch, but both
 * end in the same `resolve-from` call, so a single `require.resolve` covers both cases (and, like
 * Expo, leaves subpath resolution to the package's `exports`/`main`).
 *
 * Only a missing module gets the install hint; any other resolution failure (a malformed
 * package.json, an `exports` map that rejects the subpath, an import-only export condition) is
 * rethrown with its real cause, since "install it" would be the wrong advice there. Exported for
 * tests: bun's `require.resolve` reports every failure as MODULE_NOT_FOUND, so the other-cause
 * branch is only reachable under bun:test through an injected `require` that fails the way Node
 * does (e.g. ERR_PACKAGE_PATH_NOT_EXPORTED).
 */
export const resolvePluginFilePath = (
	projectRequire: NodeJS.Require,
	projectRoot: string,
	pluginReference: string,
): string => {
	try {
		return projectRequire.resolve(pluginReference);
	} catch (error) {
		const prefix = `Failed to resolve provider plugin "${pluginReference}" relative to "${projectRoot}"`;
		const code = (error as NodeJS.ErrnoException | undefined)?.code;
		if (code === "MODULE_NOT_FOUND" || code === "ERR_MODULE_NOT_FOUND") {
			throw new Error(
				`${prefix}. ` +
					(pluginReference === EAS_PROVIDER_PACKAGE
						? `Install it with \`npx expo install --dev ${EAS_PROVIDER_PACKAGE}\`.`
						: 'Make sure it is installed in the project and resolvable from CommonJS (a package exposing only an "import" export condition is not supported).'),
			);
		}
		throw new Error(`${prefix}: ${error instanceof Error ? error.message : String(error)}`, {
			cause: error,
		});
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
 *
 * Exported for tests: bun's `require` loads ESM natively, so the fallback is only reachable under
 * bun:test through an injected `require` that rejects ESM the way Node <20.19 does.
 */
export const importPluginFile = async (
	projectRequire: NodeJS.Require,
	pluginFile: string,
): Promise<unknown> => {
	try {
		return projectRequire(pluginFile);
	} catch (error) {
		const code = (error as NodeJS.ErrnoException | undefined)?.code;
		if (code !== "ERR_REQUIRE_ESM" && code !== "ERR_REQUIRE_ASYNC_MODULE") throw error;
		return await dynamicImport(pathToFileURL(pluginFile).href);
	}
};

/** Providers may export a plain object or a callable `module.exports` with the methods attached. */
const isObjectLike = (value: unknown): value is Record<string, unknown> =>
	(typeof value === "object" || typeof value === "function") && value !== null;

/**
 * Picks the current method name over the deprecated `*Remote*` one, going by what is actually a
 * function: a key that merely exists (e.g. a transpiled `exports.resolveBuildCache = void 0`)
 * never shadows a working deprecated method.
 */
const pickMethod = <T>(current: unknown, deprecated: unknown): T | null => {
	if (typeof current === "function") return current as T;
	if (typeof deprecated === "function") return deprecated as T;
	return null;
};

const toNormalizedPlugin = (value: unknown): ResolvedProviderPlugin | null => {
	if (!isObjectLike(value)) return null;
	const resolveBuildCache = pickMethod<ResolvedProviderPlugin["resolveBuildCache"]>(
		value["resolveBuildCache"],
		value["resolveRemoteBuildCache"],
	);
	const uploadBuildCache = pickMethod<ResolvedProviderPlugin["uploadBuildCache"]>(
		value["uploadBuildCache"],
		value["uploadRemoteBuildCache"],
	);
	if (!resolveBuildCache || !uploadBuildCache) return null;
	const plugin: ResolvedProviderPlugin = { resolveBuildCache, uploadBuildCache };
	const calculateFingerprintHash = value["calculateFingerprintHash"];
	if (typeof calculateFingerprintHash === "function") {
		plugin.calculateFingerprintHash =
			calculateFingerprintHash as ResolvedProviderPlugin["calculateFingerprintHash"];
	}
	return plugin;
};

/**
 * Digs through `export default` / `module.exports.default` interop wrappers (an ESM namespace
 * around a transpiled CJS module nests them twice) to find the plugin. Unwrapping stops at the
 * first value that validates, so a plugin carrying its own `default` key is never unwrapped past.
 */
const toProviderPlugin = (value: unknown): ResolvedProviderPlugin | null => {
	let candidate = value;
	for (let depth = 0; depth <= 2; depth++) {
		const plugin = toNormalizedPlugin(candidate);
		if (plugin) return plugin;
		if (!isObjectLike(candidate) || !("default" in candidate)) return null;
		candidate = candidate["default"];
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
): Promise<ResolvedProviderPlugin> => {
	const reference = pluginReference === "eas" ? EAS_PROVIDER_PACKAGE : pluginReference;
	const projectRequire = requireFromProject(projectRoot);

	const pluginFile = resolvePluginFilePath(projectRequire, projectRoot, reference);

	const plugin = toProviderPlugin(await importPluginFile(projectRequire, pluginFile));
	if (!plugin) {
		throw new Error(
			`The provider plugin "${reference}" must export an object containing the resolveBuildCache and uploadBuildCache functions.`,
		);
	}
	return plugin;
};
