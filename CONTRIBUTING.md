# Contributing

Bug reports and fixes are welcome. For anything bigger than a fix, open an [issue](https://github.com/haruhimemoe/harumin-config/issues) first so we can agree on it.

Read [AGENTS.md](./AGENTS.md) before changing code. It has the layout and code style.

## Setup

You need [Bun](https://bun.sh) (the version in `package.json`) and Node 22.12 or later.

```sh
bun install
```

Changing a schema changes both the bot and the site. Release this package first, then bump it in both.

## Making a change

1. Branch from `main` (`feat/<topic>`, `fix/<topic>`).
2. Write a failing test in `tests/`, make it pass, and keep commits small. Use [Conventional Commits](https://www.conventionalcommits.org/).
3. Run the full check before opening a PR:

   ```sh
   bun run check && bun run typecheck && bun run test:coverage && bun run test:dist
   ```

4. Add a line to `CHANGELOG.md` under `## [Unreleased]`.
5. Open a PR. CI must be green before merge.
