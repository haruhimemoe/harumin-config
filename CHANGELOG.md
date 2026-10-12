# Changelog

All notable changes to `@haruhimemoe/harumin-config` are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.14.0] - 2026-10-12

### Added

- Drafts on Discord. `TOURNEY_ROUTES.draft` answers an edition's draft as a linked guild reads it (`tourneyDraftSchema`, its players `draftPlayerSchema`): the pick on the clock and its deadline, up to five teams next, the picks made, the players left by rank, and what the Discord user named by `DISCORD_USER_HEADER` may do. `TOURNEY_ROUTES.draftPick` takes a captain's pick (`draftPickBodySchema`), which names the pick its menu was made for so a stale menu or a second click is refused, and answers the draft after it (`draftPickAnswerSchema`).
- `TOURNEY_ROUTES.roleGuilds` answers every guild a role rule of an enabled link names (`roleGuildsSchema`). harumin refreshes the roles of members it sees only in those.
- `HARUMIN_COLLECTIONS.tourneyDrafts` (`tourney_drafts`): the bot's draft mirrors, one per edition.
- Each new schema exports its type under the PascalCase name: `DraftPlayer`, `TourneyDraft`, `DraftPickBody`, `DraftPickAnswer` and `RoleGuilds`.

## [0.13.0] - 2026-10-12

### Added

- The tourney.haruhime.moe contract. Role rules: `ROLE_TRIGGERS`, `ROLE_REVOKES`, `MAX_ROLE_RULES` (25), `roleTriggerSchema`, `roleRuleSchema` and `roleRulesSchema` (unique ids, one guild and one revoke per role). A lineage's link to Discord: `tourneyLinkSchema`. The channel a harumin post goes to: `notificationRouteSchema`.
- Two bot routes tourney calls: `SERVICE_ROUTES.guildRoles` answers a guild's roles and what harumin may do with them (`guildRolesSchema`); `SERVICE_ROUTES.tourneyPost` takes one embed with no mentions and an optional Register button, whose custom id starts with `REGISTER_BUTTON_PREFIX` (`tourneyPostBodySchema`, `tourneyEmbedSchema`), and answers the message's id (`tourneyPostAnswerSchema`).
- tourney's routes for harumin, `TOURNEY_ROUTES`, and `DISCORD_USER_HEADER` for `/api/v1` calls made for a Discord user. Role sync: `roleSyncJobSchema`, `roleSyncClaimBodySchema`, `roleSyncClaimAnswerSchema`, `roleSyncAckBodySchema`, `roleSyncRefreshBodySchema`, `ROLE_SYNC_ERRORS`, `ROLE_SYNC_LEASE_SECONDS` (120) and `MAX_ROLE_SYNC_CLAIM` (50). A guild's linked lineages: `tourneyGuildSchema`. What the Register button does: `registrationButtonSchema`.
- Each new schema exports its type under the PascalCase name (`roleRuleSchema` gives `RoleRule`), and `RoleRevoke` and `RoleSyncError` name one revoke and one error.

### Changed

- CI runs CodeQL and a gitleaks scan of the full git history, and Dependabot covers dependencies and pinned actions. Dependencies are on their latest versions.

## [0.12.0] - 2026-10-10

### Added

- `noticeCardSchema` and `CARD_ROUTES.notice`: errors and confirmations as an image, in styled runs (plain, bold, code), at most 600 characters.

## [0.11.1] - 2026-10-10

### Fixed

- `guildSettingsPatchSchema` takes the `replay` auto-embed. In 0.11.0 it refused any patch that set it.

## [0.11.0] - 2026-10-10

### Added

- A `replay` auto-embed (on by default): `.osr` files posted in chat get a score card.

## [0.10.0] - 2026-10-09

### Added

- A pool card slot takes `mine` (`{ grade, accuracy, pp }` or null): the player's best score on the map, for /pool me.

## [0.9.0] - 2026-10-08

### Added

- `poolCardSchema.source` takes `"practice"` (/practice), `"fromtop"` (/pool fromtop) and `"me"` (/pool me).

## [0.8.0] - 2026-10-08

### Added

- `CARD_ACCENTS` (8 fixed accents, rose first) and `CARD_COVERS`.
- `userSettingsSchema` and `readUserSettings`: per-player card settings keyed by osu! id, stored in `HARUMIN_COLLECTIONS.userSettings` (`user_settings`).
- `SERVICE_ROUTES.revalidateUser` and `revalidateUserBodySchema`.
- `theme` on `profileCardSchema` (`cardThemeSchema`): accent and favorite line.

## [0.7.0] - 2026-10-08

### Added

- `session` on `scoreCardSchema` (`scoreSessionSchema`): attempts on the map in the last 24 h and a note.

## [0.6.0] - 2026-10-08

### Added

- Card images for `/info`, `/link` and `/invite`: `infoCardSchema`, `linkCardSchema` and `inviteCardSchema`, and their `CARD_ROUTES`.

## [0.5.0] - 2026-10-08

### Added

- Card images for `/matchcost`, `/pack`, `/pool`, `/server`, `/track list` and bb links: `matchCostCardSchema` (with `MAX_MATCH_ROWS`), `poolCardSchema` (with `MAX_POOL_SLOTS` and `POOL_CHECKS`), `serverCardSchema` (with `MAX_SERVER_ROWS`), `tracksCardSchema` and `bbCardSchema`, and their `CARD_ROUTES`.

## [0.4.0] - 2026-10-07

### Added

- Card images for `/map`, `/leaderboard`, `/simulate` and `/compare`: `mapCardSchema`, `leaderboardCardSchema` (with `MAX_LEADERBOARD_ROWS`), `simulateCardSchema` and `compareCardSchema` (with `compareSideSchema`), and their `CARD_ROUTES`.

## [0.3.0] - 2026-10-07

### Added

- `profileCardSchema` takes `cover: "image" | "hole"` (default `"image"`). `"hole"` asks the site to leave the cover transparent.
- `CARD_LAYOUT`: the profile card's size and cover box, shared by the bot and the site.

## [0.2.0] - 2026-10-07

### Added

- Card images: `CARD_ROUTES` (the site's image routes), `profileCardSchema`, `scoreCardSchema`, `scoreListCardSchema`, the shared `cardPlayerSchema` and `cardScoreSchema`, `GRADES` and `MAX_CARD_ROWS`. Image URLs are limited to `assets.ppy.sh`.

## [0.1.0] - 2026-10-06

### Added

- Guild settings (`guildSettingsSchema`, `defaultGuildSettings`, `readGuildSettings`, `guildSettingsPatchSchema`, `applyGuildSettingsPatch`), auto-embed keys, defaults and labels, `/track` entries, collection names, the bot's service routes and their bodies, and `guildIconUrl`.

[unreleased]: https://github.com/haruhimemoe/harumin-config/compare/v0.14.0...HEAD
[0.14.0]: https://github.com/haruhimemoe/harumin-config/compare/v0.13.0...v0.14.0
[0.13.0]: https://github.com/haruhimemoe/harumin-config/compare/v0.12.0...v0.13.0
[0.12.0]: https://github.com/haruhimemoe/harumin-config/compare/v0.11.1...v0.12.0
[0.11.1]: https://github.com/haruhimemoe/harumin-config/compare/v0.11.0...v0.11.1
[0.11.0]: https://github.com/haruhimemoe/harumin-config/compare/v0.10.0...v0.11.0
[0.10.0]: https://github.com/haruhimemoe/harumin-config/compare/v0.9.0...v0.10.0
[0.9.0]: https://github.com/haruhimemoe/harumin-config/compare/v0.8.0...v0.9.0
[0.8.0]: https://github.com/haruhimemoe/harumin-config/compare/v0.7.0...v0.8.0
[0.7.0]: https://github.com/haruhimemoe/harumin-config/compare/v0.6.0...v0.7.0
[0.6.0]: https://github.com/haruhimemoe/harumin-config/compare/v0.5.0...v0.6.0
[0.5.0]: https://github.com/haruhimemoe/harumin-config/compare/v0.4.0...v0.5.0
[0.4.0]: https://github.com/haruhimemoe/harumin-config/compare/v0.3.0...v0.4.0
[0.3.0]: https://github.com/haruhimemoe/harumin-config/compare/v0.2.0...v0.3.0
[0.2.0]: https://github.com/haruhimemoe/harumin-config/compare/v0.1.0...v0.2.0
[0.1.0]: https://github.com/haruhimemoe/harumin-config/releases/tag/v0.1.0
