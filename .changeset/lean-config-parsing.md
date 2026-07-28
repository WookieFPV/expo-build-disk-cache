---
"expo-build-disk-cache": minor
---

Remove `zod` as a runtime dependency

Config parsing is basic enough to do by hand, so `zod` is gone. This drops ~6.4 MB from the
install footprint and — more importantly — removes a version conflict: `@expo/cli` (a peer
dependency, so always present) depends on `zod@^3`, while this package required `zod@^4`, which
forced a duplicate `zod` install or a resolution conflict in stricter package managers. The built
output barely changes, since `zod` was already external to the bundle.

Config validation is now per field instead of all-or-nothing: a single invalid value falls back to
its default and keeps the rest of your config, where it previously discarded every config file.
Warnings now name the offending option, its value, the fallback that was used, and which config
sources were read.

Behaviour changes worth knowing about:

- An unrecognised boolean value now falls back to the option's default instead of always resolving
  to `false`. If you relied on `DISK_CACHE_ENABLE=off` (or any other unrecognised value) to disable
  the cache, it now stays **enabled** — `on` and `off` are accepted values from this release, so
  `DISK_CACHE_ENABLE=off` keeps working as intended.
- Boolean values are trimmed, so `DISK_CACHE_DEBUG=" true "` is accepted.
- `cacheGcTimeDays` rejects non-finite values (`Infinity`), empty strings and non-primitives
  instead of silently resolving to `Infinity` or `0`. Use `-1` to disable cache cleanup.
- `remoteOptions` rejects JSON arrays and scalars; it must be an object.
- `cacheDir` and `remotePlugin` now warn when they are not a non-empty string, instead of being
  dropped silently.
- `null` in a config file (for example `enable:` with no value in YAML) is treated as "not set"
  rather than throwing.
- `getConfig()` omits `remotePlugin` when it is not configured, instead of setting the key to
  `undefined`.
