# @haruhimemoe/harumin-config

The settings contract between [harumin](https://github.com/haruhimemoe/harumin), the osu! Discord bot, and [harumin.haruhime.moe](https://github.com/haruhimemoe/harumin.haruhime.moe), its dashboard. Both import the same zod schemas, so the site never writes a document the bot can't read.

```sh
bun add @haruhimemoe/harumin-config zod
```

## What's in it

| Export | What it is |
| --- | --- |
| `guildSettingsSchema`, `GuildSettings` | One guild's settings: `guildId`, `autoEmbeds` (one boolean per link type), `defaultMode`, `updatedAt`, `updatedBy`. Missing fields take the defaults. |
| `defaultGuildSettings(guildId)` | The settings a guild has before anyone changes them. |
| `readGuildSettings(guildId, stored)` | A stored document with defaults filled in. Nothing stored, a document that doesn't parse, or another guild's document all read as the defaults. |
| `guildSettingsPatchSchema`, `applyGuildSettingsPatch(current, patch, by, now?)` | What the dashboard may change (strict: unknown keys fail), and applying it without changing `current`. |
| `AUTO_EMBED_KEYS`, `DEFAULT_AUTO_EMBEDS`, `AUTO_EMBED_LABELS` | `map`, `match`, `pack`, `pool`, `bb`. Beatmaps, packs and pools are on by default. Labels for the dashboard. |
| `RULESETS`, `rulesetSchema`, `snowflakeSchema` | osu!'s rulesets, and a Discord id (17 to 20 digits). |
| `trackEntrySchema`, `TrackEntry`, `MAX_TRACKED_PER_GUILD` | One `/track` entry (guild, channel, osu! id and name, ruleset, who added it, when), and the per-guild cap (25). |
| `HARUMIN_COLLECTIONS` | The MongoDB collection names both apps use. |
| `SERVICE_ROUTES`, `manageableGuildsSchema`, `guildChannelsSchema`, `revalidateBodySchema` | The bot's bearer-authenticated routes the dashboard calls, and their bodies. |
| `guildIconUrl(guild, size?)` | A guild's icon on Discord's CDN, or null. |
| `CARD_ROUTES`, `profileCardSchema`, `scoreCardSchema`, `scoreListCardSchema` | The site's bearer-authenticated image routes and what the bot posts to them: a profile, one score, or a page of up to `MAX_CARD_ROWS` scores. Image URLs must be on `assets.ppy.sh`. |
| `cardPlayerSchema`, `cardScoreSchema`, `GRADES` | The player and score shapes those cards share, and osu!'s grades. |

## License

MIT
