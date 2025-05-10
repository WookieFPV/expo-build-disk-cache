# expo-build-disk-cache

> **Warning**: This plugin requires Expo SDK 53 or higher to work

A plugin for Expo CLI that uses the local disk as a build cache, improving build times by caching build artifacts. This can be used in combination with a cloud-synced folder to share the cache across multiple machines.

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
     "expo": {
       "experiments": {
         "remoteBuildCache": {
           "provider": {
             "plugin": "expo-build-disk-cache"
           }
         }
       }
     }
   }
   ```

### Optional Configuration

You can configure the plugin in two ways:

- **Option A: In App Config**  
  Add the following to your `app.json` or `app.config.js`:

  ```json
  {
    "expo": {
      "experiments": {
        "remoteBuildCache": {
          "provider": {
            "plugin": "expo-build-disk-cache",
            "options": {
              "cacheDir": "~/.my-cache/",
              "cacheGcTimeDays": 21
            }
          }
        }
      }
    }
  }
  ```

- **Option B: In a Separate Config File**  
  Create a `disk-cache.json` file in your project or home directory. This allows per-machine customization without affecting the fingerprint and can be added to `.gitignore`. The config file merges with the app config and overrides conflicting settings.

  ```json
  {
    "cacheDir": "~/.my-cache/",
    "cacheGcTimeDays": 21
  }
  ```

### Default Configuration

- `cacheDir`: Defaults to a temporary directory in the system's temp folder.
- `cacheGcTimeDays`: Defaults to 7 days; files will be deleted if not used within this period. Set to `-1` to prevent deletion.

For a complete list of available configuration options, refer to the [source configuration file](src/config/config.ts).

### Using a Cloud-Synced Folder for Cache

To share the build cache across multiple machines, set `cacheDir` to a folder synced with a cloud service (e.g., Dropbox, Google Drive, OneDrive). This is beneficial for small teams or individuals who want to speed up their builds without setting up a dedicated server. Larger teams or organizations may want to consider a solution with server for caching.

### Benefits

- **Easy Sharing**: No additional infrastructure is required.
- **Improved Efficiency**: Speeds up builds on all machines.

> **Tip**: Use `cacheGcTimeDays` to control how long files are kept in the cache.

---

## Acknowledgments

> **Special thanks to [Expo](https://expo.dev/) for making this possible and for their overall great software.**
