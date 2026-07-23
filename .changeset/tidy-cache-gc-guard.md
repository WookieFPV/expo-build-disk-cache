---
"expo-build-disk-cache": patch
---

Fix cache garbage collection incorrectly protecting files from deletion via a substring path match; it now compares exact basenames. Also fix `logger.debug`/`logger.info` returning the no-op function reference instead of invoking it when debug mode is off.
