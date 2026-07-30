---
"expo-build-disk-cache": patch
---

Drop `zod` as a dependency and parse the config by hand. This removes 6.4 MB from the install footprint and the version conflict with `@expo/cli` (a peer dependency), which itself depends on `zod@^3` while this package required `zod@^4`.

Config handling gets more forgiving and more talkative along the way:

- One invalid option no longer discards the whole config. An invalid `cacheDir`, `remotePlugin` or `DISK_CACHE_REMOTE_OPTIONS` used to drop every other option back to its default; now each option falls back on its own.
- Warnings name the option, the file or environment variable it came from, the offending value and the fallback that was used, instead of `Invalid config value: undefined`. They are also no longer repeated on every resolve/upload call.
- `on` and `off` are accepted as booleans, and boolean values are trimmed — `enable: " true "` used to resolve to `false`.
- An unrecognised boolean (`enable: "maybe"`) keeps the option's default instead of resolving to `false` and silently disabling the cache.
- An empty key in a YAML/JSON config file (`enable:`) is treated as absent rather than as an invalid value.
- `cacheDir: ""` falls back to the default cache directory instead of resolving to the current working directory.
