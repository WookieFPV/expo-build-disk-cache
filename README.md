# expo-build-disk-cache [![npm][npm-image]][npm-url] ![npm][npm-dl-stats]

> **Warning**: This plugin requires Expo SDK 53 or higher to work

🚀 Drastically speed up your npx expo run:[android|ios] builds!\
This plugin adds local disk caching for Expo builds (and the EAS Cache Provider).
If a matching cached build exists, it launches instantly, letting you skip the often time-consuming compilation step entirely.
Uses Expo fingerprint (a hash of your native project and dependencies) for intelligent invalidation, building fresh only when needed.
Can be combined with remote caching providers like EAS (this will cache downloaded builds).

## Table of Contents

- [Getting Started](#getting-started)
- [Optional Configuration](#optional-configuration)
- [Using a Cloud-Synced Folder for Cache](#using-a-cloud-synced-folder-for-cache)
- [Benefits](#benefits)
- [Acknowledgments](#acknowledgments)

### Getting Started

1. **Install it as a dev dependency**:

   ```bash
   npm install --save-dev expo-build-disk-cache
   ```

2. **Add it to your app config (still experimental)**:

   ```json
   {
     "experiments": {
       "buildCacheProvider": {
         "plugin": "expo-build-disk-cache"
       }
     }
   }
   ```

### Optional Configuration

You can configure the plugin in a few ways:

- **Option A: In App Config**  
  Add the following to your `app.json` or `app.config.js`:
  [HINT:] Keep in mind any change here will result in a different fingerprint -> needs rebuilding

  ```json
  {
    "experiments": {
      "buildCacheProvider": {
        "plugin": "expo-build-disk-cache",
        "options": {
          "cacheDir": "~/expo-build-disk-cache/"
        }
      }
    }
  }
  ```

- **Option B: In a Separate Config File**  
  Create a `disk-cache.json` file in your project or home directory. This allows per-machine customization without affecting the fingerprint and can be added to `.gitignore`. The config file merges with the app config and overrides conflicting settings. Also supports the platform specific config folder by using [env-paths](https://github.com/sindresorhus/env-paths?tab=readme-ov-file#pathsconfig).

  ```json
  {
    "cacheDir": "~/expo-build-disk-cache/",
    "cacheGcTimeDays": 21
  }
  ```

- **Option C: In package.json**
  ```json
  {
    "disk-cache": {
      "cacheDir": "~/expo-build-disk-cache/",
      "cacheGcTimeDays": 21
    }
  }
  ```

### Default Configuration

- `cacheDir`: Defaults to a temporary directory in the system's temp folder. (good alternative: `~/expo-build-disk-cache/`).
- `remotePlugin`: [Optional] Set to `eas` to use the EAS remote build cache provider. You can also any other build cache provider.
- `remoteOptions`: [Optional] Options for the remote build cache provider. This is a object that will be passed to the remote build cache provider. (Not needed for eas but other providers may need it)
- `cacheGcTimeDays`: Defaults to 7 days; files will be deleted if not used within this period. Set to `-1` to prevent deletion.
- `debug`: Defaults to `false`. Set to `true` for verbose logging
- `enable`: Defaults to `true`. Set to `false` to disable the plugin.

For a complete list of available configuration options, refer to the [source configuration file](src/config/config.ts).

### Combine with EAS Build Cache Provider (Recommended Setup)

Add `remotePlugin` to your configuration to use the EAS remote build cache provider. This will combine both Providers. This caches downloaded builds from EAS and local builds. This is the recommended way to use this plugin.

  ```json
  {
    "experiments": {
      "buildCacheProvider": {
        "plugin": "expo-build-disk-cache",
        "options": {
          "remotePlugin": "eas",
          "cacheDir": "~/expo-build-disk-cache/"
        }
      }
    }
  }
  ```

### Using a Cloud-Synced Folder for Cache (Not Recommended)

To share the build cache across multiple machines, set `cacheDir` to a folder synced with a cloud service (e.g., Dropbox, Google Drive, OneDrive). This is beneficial for small teams or individuals who want to speed up their builds without setting up a dedicated server. Larger teams or organizations may want to consider a solution with server for caching.

---

## Acknowledgments

> **Special thanks to [Expo](https://expo.dev/) for making this possible and for their overall great software.**

[npm-image]: https://img.shields.io/npm/v/expo-build-disk-cache
[npm-url]: https://www.npmjs.com/package/expo-build-disk-cache
[npm-dl-stats]: https://img.shields.io/npm/dm/expo-build-disk-cache
