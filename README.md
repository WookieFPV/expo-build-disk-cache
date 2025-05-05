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

### 3. [Optional] Customize the Cache Directory

You can specify a custom cache directory by creating a `.disk-cache.json` file:

```json
{
  "cacheDir": "~/.my-cache/"
}
```

- **Location**: Place this file in the root of your project or in your home directory.
- **Default Behavior**: If no configuration is provided, the default cache directory is a temporary folder.

For a full list of available configuration options, refer to the [source configuration file](./src/config.ts).

---

## Using a Cloud-Synced Folder for Cache

To share the build cache across multiple machines, set `cacheDir` to a folder synced with a cloud service (e.g., Dropbox, Google Drive, OneDrive).

### Benefits:
- **Easy Sharing**: No additional infrastructure is required.
- **Improved Efficiency**: Speeds up builds on all machines.

> **Tip**: Periodically clean up the cache to save storage space.

---

## Acknowledgments

> **Special thanks to [Expo](https://expo.dev/) for making this possible and for their overall great software.**
