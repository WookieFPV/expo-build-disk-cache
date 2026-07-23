# Contributing

Thanks for considering a contribution to `expo-build-disk-cache`!

## Setup

This project uses [Bun](https://bun.sh/).

```bash
bun install
```

## Development

```bash
bun run build:dev   # build in watch mode
bun test             # run tests
bun run typecheck    # run tsc
bun run lint         # run biome, with autofix
```

`lefthook` runs lint/format checks on commit — no extra setup needed after `bun install`.

## Making Changes

1. Fork the repo and create a branch off `main`.
2. Make your change, with tests covering new behavior where practical.
3. Run `bun run typecheck`, `bun run lint:CI`, and `bun test` locally — CI runs the same checks.
4. For any user-facing change, add a changeset:
   ```bash
   bun run changeset
   ```
   This records what changed and at what semver bump, and generates the `CHANGELOG.md` entry on release. Commit the generated file in `.changeset/`.
5. Open a pull request. GitHub Actions will run typecheck, lint, tests, and build automatically.

## Releasing

Releases are handled by [Changesets](https://github.com/changesets/changesets) via GitHub Actions — see the [Releases section](./README.md#-releases) in the README. Contributors don't need to publish anything manually.

## Reporting Issues

Please include:

- The Expo SDK version and platform (iOS/Android)
- Your `buildCacheProvider` configuration
- Whether you're running `expo run:android`/`expo run:ios` directly, or a different build pipeline (this plugin only works with `expo run:*` — see the [README limitations section](./README.md#️-how-it-works--limitations))
- Relevant logs with `debug: true` enabled
