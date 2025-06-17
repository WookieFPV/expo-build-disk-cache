# expo-build-disk-cache [![npm][npm-image]][npm-url] ![npm][npm-dl-stats]

🚀 Drastically speed up your npx expo run:[android | ios] builds!\
This plugin adds local disk caching for Expo builds.
If a matching cached build exists, it launches instantly, letting you skip the often time-consuming compilation step entirely.\
Can be combined with remote caching providers (like [**eas-build-cache-provider**](https://docs.expo.dev/guides/cache-builds-remotely/#using-eas-as-a-build-provider)).

> If you want remote caching using S3 storage, consider using the [**build-cache-s3**](https://github.com/WookieFPV/build-cache-s3) plugin.

## Quick Start

- **Requires Expo SDK 53+**
- Install:
  ```bash
  npm install --save-dev expo-build-disk-cache
  ```
- Add to your app config:
  ```json
  {
    "experiments": {
      "buildCacheProvider": {
        "plugin": "expo-build-disk-cache"
      }
    }
  }
  ```
- `expo run:android` or `expo run:ios` will now use the cache.

## Configuration (optional)

| Option            | Description                                          | Default         | Env Variable                                 |
|-------------------|------------------------------------------------------|-----------------|----------------------------------------------|
| `cacheDir`        | Path to the cache directory                          | System temp dir | `DISK_CACHE_CACHE_DIR`                       |
| `cacheGcTimeDays` | Days before unused files are deleted (`-1` disables) | 7               | `DISK_CACHE_GC_TIME_DAYS`                    |
| `debug`           | Enable verbose logging                               | false           | `DISK_CACHE_DEBUG`                           |
| `enable`          | Enable or disable the plugin                         | true            | `DISK_CACHE_ENABLE`                          |
| `remotePlugin`    | Remote cache provider (e.g., `eas`)                  | N/a             | `DISK_CACHE_REMOTE_PLUGIN`                   |
| `remoteOptions`   | Options for the remote build cache provider          | N/a             | `DISK_CACHE_REMOTE_OPTIONS` (as json string) |

You can configure options via:
- **Expo app config** (`app.json`, `app.config.js`, or `app.config.ts`)
- **disk-cache.json** (in the project or home directory). This allows per-machine customization without affecting the build fingerprint and can be added to `.gitignore`.
- **package.json** (under the `disk-cache` key)
- **Environment variables** (see the `Env Variable` column above. these take precedence over other config sources)

**cacheDir recommendations:**\
By default, the cache is stored in the system temporary directory, which may be cleared by the OS on reboot. For a more persistent cache, consider these alternatives (the plugin will automatically clean up old files after `cacheGcTimeDays` [default: 7 days after last access]):
- Use a directory in your home folder, such as `~/.expo-build-cache`, to share the cache across projects and retain it between reboots.
- Use `node_modules/.expo-build-disk-cache` for a project-specific cache that is easy to remove with `npm run clean` or similar scripts.

## CI/CD Build Caching

`expo-build-disk-cache` can be used in CI/CD environments by preserving the entire cache directory between workflow runs.

### Setup Instructions
1. Configure a cache directory in your project settings or via the `$DISK_CACHE_CACHE_DIR` environment variable (recommended: `node_modules/.expo-build-disk-cache`)
2. Restore this directory from your CI/CD cache provider before building
3. Execute your build command (`expo run:android` or `expo run:ios`)
4. Save the updated cache directory back to your CI/CD provider

### Optimization Options
While this approach is simple to implement, it can consume significant storage and transfer time as the entire cache directory is stored. Consider these optimizations:

- **Reduce retention period**: Set lower `cacheGcTimeDays` [default 7] to remove unused files more frequently
- **Use remote caching**: For more efficient transfers, consider:
  - The built-in `remotePlugin` option with EAS
  - [build-cache-s3](https://github.com/WookieFPV/build-cache-s3) for S3-compatible storage

Remote caching solutions only transfer files needed for the current build, significantly reducing cache size and transfer times.

### Combine with EAS Build Cache Provider

Add `remotePlugin` to your configuration to use the EAS remote build cache provider.
```json
{
  "experiments": {
    "buildCacheProvider": {
      "plugin": "expo-build-disk-cache",
      "options": {
        "remotePlugin": "eas"
      }
    }
  }
}
```

## Acknowledgments

> **Special thanks to [Expo](https://expo.dev/) for making this possible and for their overall great software.**

[npm-image]: https://img.shields.io/npm/v/expo-build-disk-cache
[npm-url]: https://www.npmjs.com/package/expo-build-disk-cache
[npm-dl-stats]: https://img.shields.io/npm/dm/expo-build-disk-cache
