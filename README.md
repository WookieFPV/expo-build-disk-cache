# expo-build-disk-cache

A plugin for Expo CLI that uses the local disk as a build cache.
Can be used in combination with a cloud-synced folder to share the cache across multiple machines.

### Getting started

1. Install it as a dev dependency:

```bash
npm install --save-dev expo-build-disk-cache
```

2. Add it to app config (its still experimental):

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

### 3. [Optional] Configuration

- Option A: In App Config
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
- Option B: In a separate config file `.disk-cache.json` (project dir or home directory)
```json
{
  "cacheDir": "~/.my-cache/",
  "cacheGcTimeDays": 21
}
```
- **Defaults**:
  - `cacheDir` is set to a temporary directory in the system's temp folder.
  - `cacheGcTimeDays` deletes files if older than 7 Days (last read/usage)


For a full list of available configuration options, refer to the [source configuration file](src/config/config.ts).

---

## Using a Cloud-Synced Folder for Cache

To share the build cache across multiple machines, set `cacheDir` to a folder synced with a cloud service (e.g., Dropbox, Google Drive, OneDrive). This might be a good option for small teams or individuals who want to speed up their builds without setting up a dedicated server. Larger teams or organizations may want to consider using a dedicated server for caching.

### Benefits:
- **Easy Sharing**: No additional infrastructure is required.
- **Improved Efficiency**: Speeds up builds on all machines.

> **Tip**: use `cacheGcTimeDays` to control how long files are kept in the cache.

---

## Acknowledgments

> **Special thanks to [Expo](https://expo.dev/) for making this possible and for their overall great software.**
```
