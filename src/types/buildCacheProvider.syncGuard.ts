/**
 * We stopped depending on `@expo/config` at runtime/peer level (see the
 * CHANGELOG entry for 0.7.6) and instead maintain a local copy of its
 * build-cache-provider types in ./buildCacheProvider.ts. `@expo/config`
 * stays as a devDependency purely so this file can catch drift: if a future
 * `@expo/config`/`@expo/cli` release reshapes these types, `tsc` fails here
 * instead of the mismatch shipping silently to consumers. If this file
 * fails to typecheck, update ./buildCacheProvider.ts to match the new shape.
 */
import type * as ExpoConfig from "@expo/config";
import type {
	BuildCacheProviderPlugin,
	ResolveBuildCacheProps,
	UploadBuildCacheProps,
} from "./buildCacheProvider.ts";

// Bidirectional assignability rather than exact type identity: we only care
// that the shapes are structurally interchangeable, not that they're
// represented identically (e.g. an intersection vs. an equivalent flat
// object type should still pass).
// Tuple-wrapped to prevent the conditional from distributing over union
// types like `BuildCacheProviderPlugin` (a union of provider shapes).
type MutuallyAssignable<A, B> = [A] extends [B] ? ([B] extends [A] ? true : false) : false;
type Assert<T extends true> = T;

type _ResolveBuildCacheProps = Assert<
	MutuallyAssignable<ResolveBuildCacheProps, ExpoConfig.ResolveBuildCacheProps>
>;
type _UploadBuildCacheProps = Assert<
	MutuallyAssignable<UploadBuildCacheProps, ExpoConfig.UploadBuildCacheProps>
>;
type _BuildCacheProviderPlugin = Assert<
	MutuallyAssignable<
		BuildCacheProviderPlugin<Record<string, unknown>>,
		ExpoConfig.BuildCacheProviderPlugin<Record<string, unknown>>
	>
>;
