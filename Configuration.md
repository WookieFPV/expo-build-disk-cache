# Configuration Guide

This document explains how to configure **expo-build-disk-cache** for your project.

## Configuration Options (optional)

| Option            | Description                                          | Default         | Env Variable                                 |
|-------------------|------------------------------------------------------|-----------------|----------------------------------------------|
| `cacheDir`        | Path to the cache directory                          | System temp dir | `DISK_CACHE_CACHE_DIR`                       |
| `cacheGcTimeDays` | Days before unused files are deleted (`-1` disables) | 7               | `DISK_CACHE_GC_TIME_DAYS`                    |
| `debug`           | Enable verbose logging                               | false           | `DISK_CACHE_DEBUG`                           |
| `enable`          | Enable or disable the plugin                         | true            | `DISK_CACHE_ENABLE`                          |
| `remotePlugin`    | Remote cache provider (e.g., `eas`)                  | N/A             | `DISK_CACHE_REMOTE_PLUGIN`                   |
| `remoteOptions`   | Options for the remote build cache provider          | N/A             | `DISK_CACHE_REMOTE_OPTIONS` (as JSON string) |

> **Note:** Environment variables take precedence over other config sources.

## How to Configure

You can configure options via:

- Expo App Config **Config** (`app.json`, `app.config.js` or `app.config.ts`):
  ```json
  {
    "experiments": {
      "buildCacheProvider": {
        "plugin": "expo-build-disk-cache",
        "options": {
          "cacheDir": "node_modules/.expo-build-disk-cache"
        }
      }
    }
  }
  ```
- Expo App Config Config **using `buildDiskCacheProvider` function**:
  ```js
  // app.config.js or app.config.ts
  import { buildDiskCacheProvider } from 'expo-build-disk-cache';
  module.exports = {
    experiments: {
      buildCacheProvider: buildDiskCacheProvider({
        cacheDir: 'node_modules/.expo-build-disk-cache'
      })
    }
  };
  ```

- **disk-cache.json** (in the project or home directory). This allows per-machine customization without affecting the build fingerprint and can be added to `.gitignore`.
  ```json
  {
    "cacheDir": "node_modules/.expo-build-disk-cache"
  }
  ```
- **package.json** (under the `disk-cache` key)
- **Environment variables** (see the `Env Variable` column above. these take precedence over other config sources)

---

## Cache Directory Recommendations

By default, the cache is stored in the system temporary directory, which may be cleared by the OS on reboot. For a more persistent cache:

- Use a directory in your home folder (e.g., `~/.expo-build-cache`) to share the cache across projects and retain it between reboots.
- Use `node_modules/.expo-build-disk-cache` for a project-specific cache that is easy to remove with `npm run clean` or similar scripts.

> The plugin automatically cleans up old files after `cacheGcTimeDays` (default: 7 days after last access).

---

## CI/CD Build Caching

**expo-build-disk-cache** can be used in CI/CD environments by preserving the entire cache directory between workflow runs.

### Setup Instructions

1. Configure a cache directory in your project settings or via the `$DISK_CACHE_CACHE_DIR` environment variable (recommended: `node_modules/.expo-build-disk-cache`)
2. Restore this directory from your CI/CD cache provider before building
3. Execute your build command (`expo run:android` or `expo run:ios`)
4. Save the updated cache directory back to your CI/CD provider

### Optimization Options

While this approach is simple, it can consume significant storage and transfer time as the entire cache directory is stored. Consider these optimizations:

- **Reduce retention period:** Set a lower `cacheGcTimeDays` (default: 7) to remove unused files more frequently.
- **Use remote caching:** For more efficient transfers, consider:
    - The built-in `remotePlugin` option with EAS
    - [build-cache-s3](https://github.com/WookieFPV/build-cache-s3) for S3-compatible storage

_Remote caching solutions only transfer files needed for the current build, significantly reducing cache size and transfer times._

---

## Using with EAS Remote Build Cache Provider

Add `remotePlugin` to your configuration to use the EAS remote build cache provider:

```json
{
  "buildCacheProvider": {
    "plugin": "expo-build-disk-cache",
    "options": {
      "remotePlugin": "eas"
    }
  }
}
```
