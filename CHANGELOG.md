# Changelog

All notable changes to `@haruhimemoe/harumin-config` are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

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

[unreleased]: https://github.com/haruhimemoe/harumin-config/compare/v0.4.0...HEAD
[0.4.0]: https://github.com/haruhimemoe/harumin-config/compare/v0.3.0...v0.4.0
[0.3.0]: https://github.com/haruhimemoe/harumin-config/compare/v0.2.0...v0.3.0
[0.2.0]: https://github.com/haruhimemoe/harumin-config/compare/v0.1.0...v0.2.0
[0.1.0]: https://github.com/haruhimemoe/harumin-config/releases/tag/v0.1.0
