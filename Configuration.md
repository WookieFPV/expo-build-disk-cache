# Configuration Guide

Configure `expo-build-disk-cache` to fine-tune its behavior.

## Configuration Options

| Option            | Description                                  | Default      | Environment Variable                 |
| :---------------- | :------------------------------------------- | :----------- | :----------------------------------- |
| `cacheDir`        | Path to store build caches                   | System temp  | `DISK_CACHE_CACHE_DIR`               |
| `cacheGcTimeDays` | Days to retain unused cache files (`-1` to disable) | 7            | `DISK_CACHE_GC_TIME_DAYS`            |
| `debug`           | Enable verbose logging                       | `false`      | `DISK_CACHE_DEBUG`                   |
| `enable`          | Enable/disable the plugin                    | `true`       | `DISK_CACHE_ENABLE`                  |
| `remotePlugin`    | Remote cache provider (e.g., `eas`)          | N/A          | `DISK_CACHE_REMOTE_PLUGIN`           |
| `remoteOptions`   | Options for the remote provider              | N/A          | `DISK_CACHE_REMOTE_OPTIONS` (JSON)   |

> **Note:** Environment variables always take precedence.

## How to Configure

Apply settings via:

- Expo App Config **Config** (`app.json`, `app.config.js` or `app.config.ts`):
  ```json5
    // For Expo 53
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
    // For Expo 54+
    {
      "buildCacheProvider": {
        "plugin": "expo-build-disk-cache",
        "options": {
          "cacheDir": "node_modules/.expo-build-disk-cache"
        }
      }
    }
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

Enable EAS remote caching by setting `remotePlugin` to `eas` in your options:

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
