---
"expo-build-disk-cache": minor
---

Remove the `@expo/cli` peer dependency. Resolving a `remotePlugin` no longer imports an internal `@expo/cli` path (`@expo/cli/build/src/utils/build-cache-providers`), which changes shape between Expo SDK releases, and package managers that auto-install peers no longer pull an `@expo/cli` version unrelated to the project's Expo SDK. The package now has zero Expo dependencies.

Note for `remotePlugin: "eas"`: `expo run` used to install `eas-build-cache-provider` on the fly. It now has to be installed in the project (`npx expo install --dev eas-build-cache-provider`); a clear error is logged if it is missing.
