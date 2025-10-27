# Changelog

## [0.7.1](https://github.com/WookieFPV/expo-build-disk-cache/compare/v0.7.0...v0.7.1) (2025-10-27)


### Bug Fixes

* improve docs ([0328528](https://github.com/WookieFPV/expo-build-disk-cache/commit/03285285c1ddc0c71d950db2707ac9367f3e944a))
* improve README.md with EXPO 54 setup ([1fb3ef8](https://github.com/WookieFPV/expo-build-disk-cache/commit/1fb3ef86e9933411e34135c373b18f08ac6f07a9))

## [0.7.0](https://github.com/WookieFPV/expo-build-disk-cache/compare/v0.6.0...v0.7.0) (2025-09-18)


### Features

* update packages and allow the users to use more versions for (zod, @expo/cli & @expo/config versions) ([0cd5ca5](https://github.com/WookieFPV/expo-build-disk-cache/commit/0cd5ca59b757af739d265aa8dcf5981179f144f0))

## [0.6.0](https://github.com/WookieFPV/expo-build-disk-cache/compare/v0.5.0...v0.6.0) (2025-09-04)


### Features

* add buildDiskCacheProvider to allowing setting buildCacheProvider in a typesafe way ([b083e80](https://github.com/WookieFPV/expo-build-disk-cache/commit/b083e8077a58bc82843e9f259c66b9f84d6ad714))

## [0.5.0](https://github.com/WookieFPV/expo-build-disk-cache/compare/v0.4.6...v0.5.0) (2025-06-17)


### Features

* add support for environment variables for all config options ([f1b48cf](https://github.com/WookieFPV/expo-build-disk-cache/commit/f1b48cfb5aef27bd85c4ea2f83af22d966f02069))


### Bug Fixes

* fix debug mode logging not showing correct stats in some configurations ([9e8f3d8](https://github.com/WookieFPV/expo-build-disk-cache/commit/9e8f3d87cd3055c92d5f74ea229417240ead5db4))
* improve cacheDirectory cleanup (ensure that only app artifacts from this package are auto deleted, other apks/files should get ignored) ([623f06e](https://github.com/WookieFPV/expo-build-disk-cache/commit/623f06e521bfca751f35fb03056db34f8e46467d))

## [0.4.6](https://github.com/WookieFPV/expo-build-disk-cache/compare/v0.4.5...v0.4.6) (2025-06-13)


### Bug Fixes

* improve exported Config types (to exactly match what's allowed) ([2ad5b6e](https://github.com/WookieFPV/expo-build-disk-cache/commit/2ad5b6ebd2fe139c719a1dd016fc7e22e372b5f3))

## [0.4.5](https://github.com/WookieFPV/expo-build-disk-cache/compare/v0.4.4...v0.4.5) (2025-06-13)


### Bug Fixes

* export Config types (useful for consumers to add types) ([2dec885](https://github.com/WookieFPV/expo-build-disk-cache/commit/2dec885c08f9c2786e2c4a5cce95c620ca63a979))

## [0.4.4](https://github.com/WookieFPV/expo-build-disk-cache/compare/v0.4.3...v0.4.4) (2025-05-20)


### Bug Fixes

* warning that occurred if no options was set. ([da21361](https://github.com/WookieFPV/expo-build-disk-cache/commit/da213611f4939204fae3cd291c7e395281f1cbd6))

## [0.4.3](https://github.com/WookieFPV/expo-build-disk-cache/compare/v0.4.2...v0.4.3) (2025-05-17)


### Bug Fixes

* allow merging of remoteOptions from multiple Config Types (appConfig + Config File). Useful if you want some options stored in the appConfig and some privat (like tokens or cacheDir) ([0a4cc9d](https://github.com/WookieFPV/expo-build-disk-cache/commit/0a4cc9d0747c57bd9ca233745aaa89281bac754a))

## [0.4.2](https://github.com/WookieFPV/expo-build-disk-cache/compare/v0.4.1...v0.4.2) (2025-05-16)


### Bug Fixes

* remove warning if cache_folder doesn't exist (happened on the first run if the cacheDir doesn't exist yet) ([7c16010](https://github.com/WookieFPV/expo-build-disk-cache/commit/7c16010427b18fc2cf6127274d486d4db6f95a76))

## [0.4.1](https://github.com/WookieFPV/expo-build-disk-cache/compare/v0.4.0...v0.4.1) (2025-05-16)


### Bug Fixes

* crash on node version before node 22 by removing esm only package & update bundling config (fix issue [#8](https://github.com/WookieFPV/expo-build-disk-cache/issues/8)) ([edf7f98](https://github.com/WookieFPV/expo-build-disk-cache/commit/edf7f9895b497d5fff38fd022dd6b0c5fb8a8b02))

## [0.4.0](https://github.com/WookieFPV/expo-build-disk-cache/compare/v0.3.0...v0.4.0) (2025-05-16)


### Features

* add support for remote build cache provider (like EAS) to combine the benefits of remote and local caching ([2723778](https://github.com/WookieFPV/expo-build-disk-cache/commit/27237784b7f3b2a5352989161fb3eb64968d1d5a))

## [0.3.0](https://github.com/WookieFPV/expo-build-disk-cache/compare/v0.2.0...v0.3.0) (2025-05-14)


### Features

* Enhanced config loading: now supports many more possible locations and can load config files from `$XDG_DATA_HOME/expo-build-disk-cache/disk-cache.json`.  
  ([7f53c3b](https://github.com/WookieFPV/expo-build-disk-cache/commit/7f53c3b0d049a806786da7225a729a5f6d9fe4ed))

### Bug Fixes

* Updated naming and configuration for the Expo BuildCache feature (renamed from RemoteBuildCache by Expo).  
  ([bb65649](https://github.com/WookieFPV/expo-build-disk-cache/commit/bb6564918958d1abf7cee406e06b5e5ba06fd701)). If you experience any issues update `@expo/config` to the latest version.

## [0.2.0](https://github.com/WookieFPV/expo-build-disk-cache/compare/v0.1.1...v0.2.0) (2025-05-09)


### Features

* add support for config file in ~/.local/share/ folder and $XDG_DATA_HOME ([d30b865](https://github.com/WookieFPV/expo-build-disk-cache/commit/d30b86537133565f164b0b7ce4906d1b38d65194))

## [0.1.1](https://github.com/WookieFPV/expo-build-disk-cache/compare/v0.1.0...v0.1.1) (2025-05-06)


### Bug Fixes

* ensure that zod works correctly in v3 and v4 (in case the consumer is overriding zod to v3) ([a04bc60](https://github.com/WookieFPV/expo-build-disk-cache/commit/a04bc608fffe999200f6b2511bbb5dbe1b6c7926))

## [0.1.0](https://github.com/WookieFPV/expo-build-disk-cache/compare/v0.0.1...v0.1.0) (2025-05-06)


### Features

* add "enable", "debug" & "cacheGcTimeDays" to config, add duck taped garbage collection of files after x days of not using them ([b062302](https://github.com/WookieFPV/expo-build-disk-cache/commit/b062302094bd88e96cc8b78f0c939ec201fc5212))
* add option to disable garbage collection of old files when cacheGcTimeDays is -1 ([f44d3a6](https://github.com/WookieFPV/expo-build-disk-cache/commit/f44d3a6386d72521a8f68c74804f81d86bc5ba40))


### Bug Fixes

* improve default cache Directory name ([735a12b](https://github.com/WookieFPV/expo-build-disk-cache/commit/735a12b98e83aed5393bf003e03f1c2a6a243b38))

## 0.0.1 (2025-05-05)


### Features

* initial release of working prototyp ([4df0091](https://github.com/WookieFPV/expo-build-disk-cache/commit/4df0091cf0d61086a9e35839ec266a5ba208e5bb))
