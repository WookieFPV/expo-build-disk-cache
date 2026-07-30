# Contributing

Thanks for contributing to `expo-build-disk-cache`!

## Setup

This project uses [Bun](https://bun.sh/).

```bash
bun install
bun test            # run tests
bun run test:perf   # run the perf tests (see below)
bun run typecheck   # run tsc
bun run lint        # run biome, with autofix
```

`src/__tests__/resolveBuildCache.perf.test.ts` asserts wall-clock budgets against the real disk and writes up to 500Mb per case, so it is skipped unless you run `bun run test:perf`. CI does not run it - the budgets fail on slow or shared runners without anything being wrong. Run it locally when you touch the read/write path.

## Pull Requests

Branch off `main` and add tests where practical. For any user-facing change run `bun run changeset` and commit the generated file in `.changeset/`. CI runs typecheck, lint, tests and build.

## Reporting Issues

Please include your Expo SDK version, platform, `buildCacheProvider` config, and logs with `debug: true` enabled.
