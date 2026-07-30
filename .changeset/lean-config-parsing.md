---
"expo-build-disk-cache": patch
---

Drop `zod` as a dependency to keep the package lean. Config parsing does the same job by hand, with three behaviour fixes:

- An invalid option now falls back to its default on its own instead of discarding the whole config file. A value that could not be read is reported with the option name and the config file (or env variable) it came from.
- `$DISK_CACHE_REMOTE_PLUGIN` now applies when `remotePlugin` is not set in any other config source, which is what the docs describe. It was previously ignored in that case.
- An unrecognised boolean (`enable: "maybe"`) now keeps the default instead of silently resolving to `false`, and `on`/`off` are accepted alongside `true`/`false`, `1`/`0` and `yes`/`no`.
