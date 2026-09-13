---
"expo-build-disk-cache": patch
---

Fix cache cleanup stopping early on an unreadable file, and a crash when the project has no readable `package.json`.
