# expo-build-disk-cache [![npm][npm-image]][npm-url] ![npm][npm-dl-stats]

> **Drastically speed up your `npx expo run:android` or `npx expo run:ios` builds!**

This plugin adds local disk caching for Expo builds. If a matching cached build exists, it launches instantly, letting you skip the often time-consuming compilation step entirely.

---

## Quick Start

- **Requires Expo SDK 53+**
- Install:
  ```bash
  npm install --save-dev expo-build-disk-cache
  ```
- Add to your app config:

  - **Expo 53:** (experimental, under `experiments`)
    ```json5
    {
      "experiments": {
        "buildCacheProvider": {
          "plugin": "expo-build-disk-cache"
        }
      }
    }
    ```
  - **Expo 54+:** (top-level `buildCacheProvider`)
    ```json5
    {
      "buildCacheProvider": {
        "plugin": "expo-build-disk-cache"
      }
    }
    ```

---

## Configuration

See [Configuration.md](./Configuration.md) for full details on advanced options, like cache directory, cache cleanup and remotePlugin.

---

## Acknowledgments

> **Special thanks to [Expo](https://expo.dev/) for making this possible and for their overall great software.**

---

[npm-image]: https://img.shields.io/npm/v/expo-build-disk-cache
[npm-url]: https://www.npmjs.com/package/expo-build-disk-cache
[npm-dl-stats]: https://img.shields.io/npm/dm/expo-build-disk-cache
