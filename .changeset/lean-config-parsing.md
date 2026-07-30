---
"expo-build-disk-cache": patch
---

Drop `zod` as a dependency to keep the package lean. Config parsing does the same job by hand, and an invalid option now falls back to its default on its own instead of discarding the whole config file.
