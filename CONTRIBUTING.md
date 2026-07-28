# Contributing

Thanks for contributing to `expo-build-disk-cache`!

## Setup

This project uses [Bun](https://bun.sh/).

```bash
bun install
bun test            # run tests
bun run typecheck   # run tsc
bun run lint        # run biome, with autofix
```

## Pull Requests

Branch off `main` and add tests where practical. For any user-facing change run `bun run changeset` and commit the generated file in `.changeset/`. CI runs typecheck, lint, tests and build.

## Reporting Issues

Please include your Expo SDK version, platform, `buildCacheProvider` config, and logs with `debug: true` enabled.
