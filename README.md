# @haruhimemoe/harumin-config

The settings contract between [harumin](https://github.com/haruhimemoe/harumin), the osu! Discord bot, and [harumin.haruhime.moe](https://github.com/haruhimemoe/harumin.haruhime.moe), its dashboard. Both import the same zod schemas, so the site never writes a document the bot can't read.

It also holds harumin's contract with [tourney.haruhime.moe](https://tourney.haruhime.moe): guild links, role rules, role sync and channel posts.

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
| `CARD_LAYOUT` | Where things sit on the card images. The profile card's `cover: "hole"` leaves `CARD_LAYOUT.profile.cover` transparent so the bot can put an animated cover under it. |
| `cardPlayerSchema`, `cardScoreSchema`, `GRADES` | The player and score shapes those cards share, and osu!'s grades. |
| `ROLE_TRIGGERS`, `ROLE_REVOKES`, `MAX_ROLE_RULES`, `roleTriggerSchema`, `roleRuleSchema`, `roleRulesSchema` | tourney's role rules: harumin gives a role while a trigger holds (`registered`, `approved`, `captain`, `eliminated`, `donated`, `attendingInPerson`, `staffRole:<role>`, `onTeam:<team id>`) and takes it back as the revoke says (`never`, `onWithdraw`, `onEditionDone`, `onRefund`). At most 25 per lineage, one guild and one revoke per role. |
| `tourneyLinkSchema`, `notificationRouteSchema` | A lineage's link to Discord (main and staff guild, on switch, nickname sync, rules), and the channel a harumin post goes to. |
| `guildRolesSchema`, `tourneyPostBodySchema`, `tourneyEmbedSchema`, `tourneyPostAnswerSchema`, `REGISTER_BUTTON_PREFIX` | The two bot routes tourney calls. `SERVICE_ROUTES.guildRoles` answers a guild's roles and what harumin may do with them; `SERVICE_ROUTES.tourneyPost` posts one embed with no mentions, with an optional Register button (custom id `REGISTER_BUTTON_PREFIX` + edition id), and answers the message's id. |
| `TOURNEY_ROUTES`, `DISCORD_USER_HEADER` | tourney's routes for harumin (bearer: tourney's `HARUMIN_SERVICE_SECRET`), and the header naming the Discord user an `/api/v1` call acts for. |
| `roleSyncJobSchema`, `roleSyncClaimBodySchema`, `roleSyncClaimAnswerSchema`, `roleSyncAckBodySchema`, `roleSyncRefreshBodySchema`, `ROLE_SYNC_ERRORS`, `ROLE_SYNC_LEASE_SECONDS`, `MAX_ROLE_SYNC_CLAIM` | Role sync: harumin claims up to 50 jobs at a time, each leased for 120 seconds, applies a member's roles and nickname in that guild, and acks each job as applied, skipped or failed. |
| `tourneyGuildSchema`, `registrationButtonSchema` | tourney's answers: the lineages linked to a guild with their running editions, and what the Register button does for a Discord user (one click, the form, link an account, or refused). |

## License

MIT
