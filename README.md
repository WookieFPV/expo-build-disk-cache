# expo-build-disk-cache [![npm][npm-image]][npm-url] ![npm][npm-dl-stats]

> ⚡ **Drastically speed up your `npx expo run:android` or `npx expo run:ios` builds!**

`expo-build-disk-cache` enables **local disk caching** for Expo builds.  
When a cached build is available, it launches almost instantly — skipping the usual compilation step.

---

## 🚀 Quick Start

### Requirements

- **Expo SDK 53+**

### Installation

```bash
npm install --save-dev expo-build-disk-cache
```

### Add to Your App Config


#### Expo SDK 54+
```jsonc
{
  "buildCacheProvider": {
    "plugin": "expo-build-disk-cache"
  }
}
```

#### Expo SDK 53 (under experiments)
```jsonc
{
  "experiments": {
    "buildCacheProvider": {
      "plugin": "expo-build-disk-cache"
    }
  }
}
```


---

## ⚙️ Configuration

See the full [Configuration Guide](./Configuration.md) for advanced usage, including:

- Custom cache directory (`cacheDir`)
- Automatic cache cleanup
- Integration with remote caching providers (like EAS)

---

## 📦 Releases

This repo uses Changesets.

1. For any user-facing package change, run `bun run changeset` and commit the generated file in `.changeset/`.
2. When changesets reach `main`, GitHub Actions opens or updates a release PR with the version bump and generated `CHANGELOG.md`.
3. Merge that release PR to publish to npm.

---

## 🤝 Acknowledgments

> Huge thanks to the [Expo](https://expo.dev/) team for making this possible and for their incredible open-source work.

---

[npm-image]: https://img.shields.io/npm/v/expo-build-disk-cache
[npm-url]: https://www.npmjs.com/package/expo-build-disk-cache
[npm-dl-stats]: https://img.shields.io/npm/dm/expo-build-disk-cache
