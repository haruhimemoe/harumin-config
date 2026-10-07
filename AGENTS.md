# AGENTS.md

`@haruhimemoe/harumin-config`: the zod schemas the harumin bot and harumin.haruhime.moe share. One file, `src/index.ts`. ESM only, zod 4 as a peer, no other runtime dependencies, no I/O.

## Rules

- **Both apps read what the other writes.** A schema change is a change to stored MongoDB documents: new fields get defaults, and nothing is renamed without a migration in the bot.
- **Reads never throw.** `readGuildSettings` falls back to defaults on a bad document; the bot must keep answering.
- **Patches are strict.** The dashboard sends `guildSettingsPatchSchema`; unknown keys fail.
- **Public API is pinned** by the inline snapshot in `tests/index.test.ts`. Adding or removing an export is a semver decision: note it in `CHANGELOG.md`.
- Code style: Biome (2 spaces, double quotes, 100 columns). Every `.ts` and `.mjs` file starts with the `@file / @desc / @author / @created / @modified` header. Coverage stays at 95% or more.
- Releases are cut by the maintainers. The first npm publish waits for David.

## Before calling a change done

```sh
bun run check && bun run typecheck && bun run test:coverage && bun run test:dist
```
